import { input, confirm } from '@inquirer/prompts';
import * as fs from 'fs';
import ora from 'ora';
import chalk from 'chalk';
import { parseSbomFile, SbomParseError } from './sbom/parser.js';
import { buildGraph, searchComponents, traceToRoot } from './sbom/graph.js';
import type { ParsedSbom } from './sbom/types.js';
import { formatTraceResult } from './output/formatter.js';
import { traceBatch, generateBatchSummary } from './batch.js';
import { formatBatchTable } from './output/batch-formatter.js';

/**
 * Run the tool in interactive mode
 */
export async function runInteractive(): Promise<void> {
  console.log(chalk.bold.blue('\n🔍 SBOM Dependency Finder - Interactive Mode\n'));

  // Step 1: Get SBOM file path
  const sbomPath = await getSbomPath();

  // Step 2: Parse SBOM and build graph
  const graph = await loadSbom(sbomPath);
  if (!graph) {
    return;
  }

  // Step 3: Choose mode
  console.log(chalk.bold('\nWhat would you like to do?\n'));
  console.log('1. Trace a single dependency');
  console.log('2. Trace multiple dependencies (batch mode)');
  console.log('3. Search for components');
  console.log('4. Show SBOM info\n');

  const mode = await input({
    message: 'Enter your choice (1-4):',
    default: '1',
    validate: (value) => {
      const num = parseInt(value);
      if (num >= 1 && num <= 4) return true;
      return 'Please enter a number between 1 and 4';
    },
  });

  switch (mode) {
    case '1':
      await traceSingleInteractive(graph);
      break;
    case '2':
      await traceMultipleInteractive(graph);
      break;
    case '3':
      await searchInteractive(graph);
      break;
    case '4':
      await showInfoInteractive(graph);
      break;
  }

  // Ask if they want to continue
  const continueSession = await confirm({
    message: 'Would you like to perform another operation?',
    default: false,
  });

  if (continueSession) {
    console.log('\n---\n');
    await runInteractive();
  } else {
    console.log(chalk.green('\n✓ Done! Thank you for using SBOM Dependency Finder.\n'));
  }
}

/**
 * Get and validate SBOM file path
 */
async function getSbomPath(): Promise<string> {
  while (true) {
    const sbomPath = await input({
      message: 'Enter the path to your SBOM file:',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Please enter a file path';
        }
        if (!fs.existsSync(value)) {
          return `File not found: ${value}`;
        }
        return true;
      },
    });

    return sbomPath.trim();
  }
}

/**
 * Load and parse SBOM file
 */
async function loadSbom(sbomPath: string): Promise<ParsedSbom | null> {
  const spinner = ora('Loading SBOM...').start();

  try {
    const document = parseSbomFile(sbomPath);
    spinner.text = 'Building dependency graph...';
    const graph = buildGraph(document);
    spinner.succeed(`Loaded SBOM with ${document.components.length} components and ${graph.rootComponents.length} marketplace module(s)`);
    return graph;
  } catch (error) {
    spinner.fail('Failed to load SBOM');
    if (error instanceof SbomParseError) {
      console.error(chalk.red(`\n✗ ${error.message}\n`));
    } else {
      console.error(chalk.red(`\n✗ Unexpected error: ${error instanceof Error ? error.message : String(error)}\n`));
    }
    return null;
  }
}

/**
 * Trace a single dependency interactively
 */
async function traceSingleInteractive(graph: ParsedSbom): Promise<void> {
  const dependencyName = await input({
    message: 'Enter the dependency name to trace:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Please enter a dependency name';
      }
      return true;
    },
  });

  const spinner = ora(`Searching for "${dependencyName}"...`).start();
  const searchResults = searchComponents(graph, dependencyName.trim(), { limit: 10 });
  spinner.stop();

  if (searchResults.length === 0) {
    console.log(chalk.red(`\n✗ No components found matching "${dependencyName}"\n`));
    console.log('Try variations like:');
    console.log(`  - Without version numbers`);
    console.log(`  - Without .jar extension`);
    console.log(`  - Just the artifact name\n`);
    return;
  }

  console.log(chalk.green(`\n✓ Found ${searchResults.length} matching component(s)\n`));

  const bestMatch = searchResults[0];
  console.log(`Using: ${chalk.bold(bestMatch.name)}${bestMatch.version ? ' v' + bestMatch.version : ''}`);

  if (searchResults.length > 1) {
    console.log(chalk.gray('\nOther matches found:'));
    searchResults.slice(1, 5).forEach((result, index) => {
      console.log(chalk.gray(`  ${index + 2}. ${result.name}${result.version ? ' v' + result.version : ''}`));
    });
  }

  const traceSpinner = ora('Tracing dependency chain...').start();
  const traceResult = traceToRoot(graph, bestMatch.bomRef);
  traceSpinner.succeed('Dependency chain traced');

  // Generate summary
  if (traceResult.paths.length > 0) {
    const completePaths = traceResult.paths.filter(p => p.isComplete);
    if (completePaths.length > 0) {
      const rootComponents = completePaths.map(p => {
        const root = p.components[p.components.length - 1];
        return root.name + (root.version ? ' v' + root.version : '');
      });
      const uniqueRoots = [...new Set(rootComponents)];

      if (completePaths[0].components.length === 1) {
        traceResult.summary = `The dependency "${bestMatch.name}" is a root marketplace module itself.`;
      } else if (completePaths[0].components.length === 2) {
        traceResult.summary = `The dependency "${bestMatch.name}" is a direct dependency of the marketplace module "${uniqueRoots[0]}".`;
      } else {
        const depth = completePaths[0].components.length - 2;
        traceResult.summary = `The dependency "${bestMatch.name}" is a transitive dependency (depth: ${depth}) brought in through: ${uniqueRoots.join(', ')}.`;
      }
    }
  }

  console.log(formatTraceResult(traceResult));
}

/**
 * Trace multiple dependencies interactively
 */
async function traceMultipleInteractive(graph: ParsedSbom): Promise<void> {
  console.log(chalk.bold('\n📋 Batch Trace Mode\n'));
  console.log('Enter dependency names one by one. Type "done" when finished.\n');

  const dependencies: string[] = [];
  let index = 1;

  while (true) {
    const dep = await input({
      message: `Dependency #${index} (or "done" to finish):`,
    });

    const trimmed = dep.trim();

    if (trimmed.toLowerCase() === 'done') {
      break;
    }

    if (trimmed.length > 0) {
      dependencies.push(trimmed);
      index++;
    }
  }

  if (dependencies.length === 0) {
    console.log(chalk.yellow('\n⚠ No dependencies entered.\n'));
    return;
  }

  console.log(chalk.bold(`\n🔄 Tracing ${dependencies.length} dependencies...\n`));

  let currentSpinner: ReturnType<typeof ora> | null = null;
  const results = traceBatch(graph, dependencies, (current, total, dependency) => {
    if (currentSpinner) {
      currentSpinner.text = `Tracing ${current}/${total}: ${dependency}`;
    } else {
      currentSpinner = ora(`Tracing ${current}/${total}: ${dependency}`).start();
    }
  });

  if (currentSpinner) {
    currentSpinner.succeed(`Traced ${dependencies.length} dependencies`);
  }

  const summary = generateBatchSummary(results);
  console.log(formatBatchTable(results, summary));
}

/**
 * Search for components interactively
 */
async function searchInteractive(graph: ParsedSbom): Promise<void> {
  const query = await input({
    message: 'Enter search query:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Please enter a search term';
      }
      return true;
    },
  });

  const spinner = ora('Searching...').start();
  const results = searchComponents(graph, query.trim(), { limit: 20 });
  spinner.stop();

  if (results.length === 0) {
    console.log(chalk.red(`\n✗ No components found matching "${query}"\n`));
    return;
  }

  console.log(chalk.bold(`\n✓ Found ${results.length} component(s):\n`));

  results.forEach((result, index) => {
    const displayName = result.version ? `${result.name} v${result.version}` : result.name;
    const typeColor = result.type === 'framework' ? chalk.blue : result.type === 'library' ? chalk.yellow : chalk.gray;

    console.log(`${index + 1}. ${chalk.green(displayName)} ${typeColor(`[${result.type}]`)}`);
    if (result.purl) {
      console.log(`   ${chalk.gray(result.purl)}`);
    }
  });

  console.log('');
}

/**
 * Show SBOM info interactively
 */
async function showInfoInteractive(graph: ParsedSbom): Promise<void> {
  const document = graph.document;

  console.log(chalk.bold('\n=== SBOM Information ===\n'));
  console.log(`Format: ${document.bomFormat} ${document.specVersion}`);
  console.log(`Serial Number: ${document.serialNumber}`);
  console.log(`Total Components: ${document.components.length}`);
  console.log(`Total Dependencies: ${document.dependencies.length}`);
  console.log(`Root Components: ${graph.rootComponents.length}`);

  // Count by type
  const typeCount = new Map<string, number>();
  for (const component of document.components) {
    typeCount.set(component.type, (typeCount.get(component.type) || 0) + 1);
  }

  console.log('\nComponents by Type:');
  for (const [type, count] of typeCount) {
    console.log(`  ${type}: ${count}`);
  }

  if (graph.rootComponents.length > 0) {
    console.log('\nRoot Marketplace Modules:');
    graph.rootComponents.slice(0, 10).forEach(component => {
      console.log(`  - ${component.name}${component.version ? ' v' + component.version : ''}`);
    });
    if (graph.rootComponents.length > 10) {
      console.log(`  ... and ${graph.rootComponents.length - 10} more`);
    }
  }

  console.log('');
}
