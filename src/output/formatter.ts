import chalk from 'chalk';
import type { TraceResult, DependencyPath, SbomComponent } from '../sbom/types.js';
import { isMendixMarketplaceComponent, isJarLibrary, getComponentDisplayName } from '../sbom/parser.js';

/**
 * Format trace results as a tree for terminal output
 */
export function formatTraceResult(result: TraceResult, options?: { verbose?: boolean }): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\n=== Dependency Trace Results ===\n'));

  // Target component
  const targetDisplay = getComponentDisplayName(result.target);
  const targetType = isMendixMarketplaceComponent(result.target)
    ? chalk.blue('[Marketplace Module]')
    : isJarLibrary(result.target)
    ? chalk.yellow('[JAR Library]')
    : chalk.gray(`[${result.target.type}]`);

  lines.push(chalk.bold('Target: ') + chalk.green(targetDisplay) + ' ' + targetType);

  if (result.target.purl) {
    lines.push(chalk.gray(`  purl: ${result.target.purl}`));
  }
  lines.push('');

  // Paths
  if (result.paths.length === 0) {
    lines.push(chalk.red('No dependency paths found.'));
    lines.push(chalk.gray('This component may not be referenced by any other components in the SBOM.'));
  } else {
    const completePaths = result.paths.filter(p => p.isComplete);
    const incompletePaths = result.paths.filter(p => !p.isComplete);

    if (completePaths.length > 0) {
      lines.push(chalk.bold(`Found ${completePaths.length} path${completePaths.length === 1 ? '' : 's'} to marketplace module${completePaths.length === 1 ? '' : 's'}:\n`));

      completePaths.forEach((path, index) => {
        lines.push(formatDependencyPath(path, index + 1, result.target['bom-ref']));
        lines.push('');
      });
    }

    if (incompletePaths.length > 0) {
      lines.push(chalk.yellow(`Found ${incompletePaths.length} incomplete path${incompletePaths.length === 1 ? '' : 's'} (no marketplace root):\n`));

      incompletePaths.forEach((path, index) => {
        lines.push(formatDependencyPath(path, index + 1, result.target['bom-ref'], true));
        lines.push('');
      });
    }
  }

  // Summary
  if (result.summary) {
    lines.push(chalk.bold('\n=== Summary ===\n'));
    lines.push(result.summary);
  }

  return lines.join('\n');
}

/**
 * Format a single dependency path as a tree
 */
function formatDependencyPath(
  path: DependencyPath,
  pathNumber: number,
  targetBomRef: string,
  isIncomplete: boolean = false
): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`Path ${pathNumber}:`));

  // Reverse the path so root is at the top
  const reversed = [...path.components].reverse();

  reversed.forEach((component, index) => {
    const isTarget = component['bom-ref'] === targetBomRef;
    const isLast = index === reversed.length - 1;

    // Determine indentation and tree characters
    const indent = '  '.repeat(index);
    const treeChar = index === 0 ? '' : '└── ';

    // Format component name
    const displayName = getComponentDisplayName(component);
    let formattedName = displayName;

    if (isMendixMarketplaceComponent(component)) {
      formattedName = chalk.blue(displayName) + ' ' + chalk.blue('[Marketplace Module]');
    } else if (isJarLibrary(component)) {
      formattedName = chalk.yellow(displayName) + ' ' + chalk.gray('[JAR]');
    }

    // Add target marker
    if (isTarget) {
      formattedName += ' ' + chalk.red('← target');
    }

    lines.push(`${indent}${treeChar}${formattedName}`);
  });

  if (isIncomplete) {
    const indent = '  '.repeat(reversed.length);
    lines.push(`${indent}${chalk.gray('(orphan - no marketplace parent found)')}`);
  }

  return lines.join('\n');
}

/**
 * Format trace results as JSON
 */
export function formatTraceResultJson(result: TraceResult): string {
  const output = {
    target: {
      name: result.target.name,
      version: result.target.version,
      type: result.target.type,
      purl: result.target.purl,
      bomRef: result.target['bom-ref'],
    },
    paths: result.paths.map(path => ({
      isComplete: path.isComplete,
      components: path.components.map(c => ({
        name: c.name,
        version: c.version,
        type: c.type,
        purl: c.purl,
        bomRef: c['bom-ref'],
      })),
    })),
    summary: result.summary,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Format a list of search results
 */
export function formatSearchResults(results: Array<{ name: string; version?: string; type: string; purl?: string; bomRef: string; score?: number }>): string {
  if (results.length === 0) {
    return chalk.red('No components found matching your search.');
  }

  const lines: string[] = [];
  lines.push(chalk.bold(`\nFound ${results.length} component${results.length === 1 ? '' : 's'}:\n`));

  results.forEach((result, index) => {
    const displayName = result.version ? `${result.name} v${result.version}` : result.name;
    const typeColor = result.type === 'framework' ? chalk.blue : result.type === 'library' ? chalk.yellow : chalk.gray;

    lines.push(`${index + 1}. ${chalk.green(displayName)} ${typeColor(`[${result.type}]`)}`);

    if (result.purl) {
      lines.push(`   ${chalk.gray(result.purl)}`);
    }

    if (result.score !== undefined) {
      lines.push(`   ${chalk.gray(`Score: ${result.score}`)}`);
    }
  });

  return lines.join('\n');
}

/**
 * Format an error message
 */
export function formatError(error: Error): string {
  return chalk.red(`\n✗ Error: ${error.message}\n`);
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
  return chalk.green(`\n✓ ${message}\n`);
}
