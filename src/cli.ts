import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import * as fs from 'fs';
import { parseSbomFile, SbomParseError } from './sbom/parser.js';
import { buildGraph, searchComponents, traceToRoot } from './sbom/graph.js';
import { formatTraceResult, formatTraceResultJson, formatSearchResults, formatError } from './output/formatter.js';
import { readDependencyList, traceBatch, generateBatchSummary } from './batch.js';
import { formatBatchTable, formatBatchCsv, formatBatchJson } from './output/batch-formatter.js';

const program = new Command();

program
  .name('sbom-finder')
  .description('Trace vulnerable JAR dependencies to their parent Mendix Marketplace widgets/modules')
  .version('0.1.0');

program
  .command('trace')
  .description('Trace a dependency to its parent marketplace module')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .argument('<dependency-name>', 'Name of the JAR dependency to trace')
  .option('--json', 'Output results as JSON instead of formatted tree')
  .option('--verbose', 'Show detailed reasoning')
  .action(async (sbomFile: string, dependencyName: string, options) => {
    try {
      // Parse SBOM
      const parseSpinner = ora('Parsing SBOM file...').start();
      const document = parseSbomFile(sbomFile);
      parseSpinner.succeed(`Parsed SBOM with ${document.components.length} components and ${document.dependencies.length} dependency relationships`);

      // Build graph
      const graphSpinner = ora('Building dependency graph...').start();
      const graph = buildGraph(document);
      graphSpinner.succeed(`Built dependency graph with ${graph.rootComponents.length} root component(s)`);

      // Search for the dependency
      const searchSpinner = ora(`Searching for "${dependencyName}"...`).start();
      const searchResults = searchComponents(graph, dependencyName, { limit: 10 });
      searchSpinner.stop();

      if (searchResults.length === 0) {
        console.log(formatError(new Error(`No components found matching "${dependencyName}"`)));
        console.log('Try variations like:');
        console.log(`  - Without version: "${dependencyName.replace(/-\d+\.\d+.*$/, '')}"`);
        console.log(`  - Without .jar extension: "${dependencyName.replace(/\.jar$/, '')}"`);
        console.log(`  - Just the artifact name: "${dependencyName.split('/').pop()?.split('-')[0]}"`);
        process.exit(1);
      }

      console.log(`\n✓ Found ${searchResults.length} matching component(s)`);

      // Use the best match (highest score)
      const bestMatch = searchResults[0];
      console.log(`\nUsing best match: ${bestMatch.name}${bestMatch.version ? ' v' + bestMatch.version : ''}`);

      if (searchResults.length > 1) {
        console.log(`\nOther matches found:`);
        searchResults.slice(1, 5).forEach((result, index) => {
          console.log(`  ${index + 2}. ${result.name}${result.version ? ' v' + result.version : ''}`);
        });
      }

      // Trace to root
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
            traceResult.summary = `The dependency "${bestMatch.name}" is a root marketplace module itself. It is not brought in by any other component.`;
          } else if (completePaths[0].components.length === 2) {
            traceResult.summary = `The dependency "${bestMatch.name}" is a direct dependency of the marketplace module "${uniqueRoots[0]}".`;
          } else {
            const depth = completePaths[0].components.length - 2;
            traceResult.summary = `The dependency "${bestMatch.name}" is a transitive dependency (depth: ${depth}) brought in through the marketplace module${uniqueRoots.length === 1 ? '' : 's'}: ${uniqueRoots.join(', ')}.`;
          }
        } else {
          traceResult.summary = `The dependency "${bestMatch.name}" exists in the SBOM but has no clear path to a marketplace module. It may be a direct runtime dependency.`;
        }
      }

      // Format output
      if (options.json) {
        console.log(formatTraceResultJson(traceResult));
      } else {
        console.log(formatTraceResult(traceResult, { verbose: options.verbose }));
      }

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('trace-batch')
  .description('Trace multiple dependencies from a file (one per line)')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .argument('<dependency-file>', 'Path to file containing dependency names (one per line)')
  .option('--format <format>', 'Output format: table, csv, json', 'table')
  .option('--output <file>', 'Write output to file instead of stdout')
  .action(async (sbomFile: string, dependencyFile: string, options) => {
    try {
      // Parse SBOM
      const parseSpinner = ora('Parsing SBOM file...').start();
      const document = parseSbomFile(sbomFile);
      parseSpinner.succeed(`Parsed SBOM with ${document.components.length} components`);

      // Build graph
      const graphSpinner = ora('Building dependency graph...').start();
      const graph = buildGraph(document);
      graphSpinner.succeed('Graph built');

      // Read dependency list
      const readSpinner = ora('Reading dependency list...').start();
      const dependencies = readDependencyList(dependencyFile);
      readSpinner.succeed(`Loaded ${dependencies.length} dependencies to trace`);

      // Trace in batch
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

      // Generate summary
      const summary = generateBatchSummary(results);

      // Format output
      let output: string;
      if (options.format === 'csv') {
        output = formatBatchCsv(results);
      } else if (options.format === 'json') {
        output = formatBatchJson(results, summary);
      } else {
        output = formatBatchTable(results, summary);
      }

      // Write output
      if (options.output) {
        fs.writeFileSync(options.output, output, 'utf-8');
        console.log(chalk.green(`\n✓ Results written to ${options.output}`));
      } else {
        console.log(output);
      }

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('search')
  .description('Search for components in an SBOM')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .argument('<query>', 'Search query (component name)')
  .option('--type <type>', 'Filter by component type (framework, library, all)', 'all')
  .option('--limit <n>', 'Maximum number of results', '15')
  .action(async (sbomFile: string, query: string, options) => {
    try {
      // Parse SBOM
      const parseSpinner = ora('Parsing SBOM file...').start();
      const document = parseSbomFile(sbomFile);
      parseSpinner.succeed(`Parsed SBOM with ${document.components.length} components`);

      // Build graph
      const graphSpinner = ora('Building dependency graph...').start();
      const graph = buildGraph(document);
      graphSpinner.succeed('Graph built');

      // Search
      const searchSpinner = ora(`Searching for "${query}"...`).start();
      const typeFilter = options.type === 'all' ? undefined : options.type;
      const results = searchComponents(graph, query, {
        typeFilter: typeFilter as any,
        limit: parseInt(options.limit, 10),
      });
      searchSpinner.stop();

      console.log(formatSearchResults(results));

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('info')
  .description('Show SBOM summary information')
  .argument('<sbom-file>', 'Path to the CycloneDX JSON SBOM file')
  .action(async (sbomFile: string) => {
    try {
      // Parse SBOM
      const spinner = ora('Analyzing SBOM...').start();
      const document = parseSbomFile(sbomFile);
      const graph = buildGraph(document);
      spinner.succeed('Analysis complete');

      console.log('\n=== SBOM Information ===\n');
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

      console.log('\nRoot Marketplace Modules:');
      graph.rootComponents.forEach(component => {
        console.log(`  - ${component.name}${component.version ? ' v' + component.version : ''}`);
      });

      console.log('');

    } catch (error) {
      if (error instanceof SbomParseError) {
        console.error(formatError(error));
        process.exit(1);
      }
      throw error;
    }
  });

export { program };
