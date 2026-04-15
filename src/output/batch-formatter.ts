import chalk from 'chalk';
import type { BatchTraceResult, BatchSummary } from '../batch.js';
import { isMendixMarketplaceComponent } from '../sbom/parser.js';

/**
 * Format batch results as a human-readable table
 */
export function formatBatchTable(results: BatchTraceResult[], summary: BatchSummary): string {
  const lines: string[] = [];

  lines.push(chalk.bold('\n=== Batch Dependency Trace Results ===\n'));

  // Summary
  lines.push(chalk.bold('Summary:'));
  lines.push(`  Total dependencies scanned: ${summary.total}`);
  lines.push(`  ${chalk.green('Found:')} ${summary.found}`);
  lines.push(`  ${chalk.red('Not found:')} ${summary.notFound}`);
  lines.push(`  ${chalk.blue('With marketplace paths:')} ${summary.withMarketplacePaths}`);
  lines.push(`  ${chalk.yellow('Without marketplace paths:')} ${summary.withoutMarketplacePaths}`);
  lines.push('');

  // Results table with full dependency trees
  lines.push(chalk.bold('Detailed Results:\n'));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];

    // Add separator between results (except before first)
    if (i > 0) {
      lines.push(chalk.gray('─'.repeat(60)));
      lines.push('');
    }

    if (result.found && result.result) {
      const completePaths = result.result.paths.filter(p => p.isComplete);
      const target = result.result.target;
      const targetDisplay = target.version ? `${target.name} v${target.version}` : target.name;

      lines.push(chalk.green('✓') + ` ${chalk.bold(result.dependency)}`);
      lines.push(`  ${chalk.gray('Target:')} ${targetDisplay} ${chalk.gray(`[${target.type}]`)}`);

      if (completePaths.length > 0) {
        lines.push(`  ${chalk.gray('Found')} ${chalk.green(completePaths.length)} ${chalk.gray(`path${completePaths.length === 1 ? '' : 's'} to marketplace modules:`)}`);
        lines.push('');

        // Show all paths (limit to first 3 for readability)
        const pathsToShow = completePaths.slice(0, 3);
        pathsToShow.forEach((path, pathIndex) => {
          lines.push(`  ${chalk.bold(`Path ${pathIndex + 1}:`)}`);

          // Reverse path so root is at the top
          const reversed = [...path.components].reverse();
          reversed.forEach((component, compIndex) => {
            const isTarget = component['bom-ref'] === target['bom-ref'];
            const indent = '    ' + ('  '.repeat(compIndex));
            const treeChar = compIndex === 0 ? '' : '└── ';

            let displayName = component.version ? `${component.name} v${component.version}` : component.name;

            // Color code by type
            if (isMendixMarketplaceComponent(component)) {
              displayName = chalk.blue(displayName) + ' ' + chalk.blue('[Marketplace Module]');
            } else {
              displayName = chalk.yellow(displayName) + ' ' + chalk.gray('[JAR]');
            }

            // Mark target
            if (isTarget) {
              displayName += ' ' + chalk.red('← target');
            }

            lines.push(`${indent}${treeChar}${displayName}`);
          });

          if (pathIndex < pathsToShow.length - 1) {
            lines.push('');
          }
        });

        if (completePaths.length > 3) {
          lines.push('');
          lines.push(`  ${chalk.gray(`... and ${completePaths.length - 3} more path${completePaths.length - 3 === 1 ? '' : 's'}`)}`);
        }

        // Add summary
        lines.push('');
        lines.push(`  ${chalk.bold('Summary:')}`);
        const rootComponents = completePaths.map(p => {
          const root = p.components[p.components.length - 1];
          return root.name + (root.version ? ' v' + root.version : '');
        });
        const uniqueRoots = [...new Set(rootComponents)];

        let summary: string;
        if (completePaths[0].components.length === 1) {
          summary = `The dependency "${result.dependency}" is a root marketplace module itself.`;
        } else if (completePaths[0].components.length === 2) {
          summary = `The dependency "${result.dependency}" is a direct dependency of the marketplace module "${uniqueRoots[0]}".`;
        } else {
          const depth = completePaths[0].components.length - 2;
          summary = `The dependency "${result.dependency}" is a transitive dependency (depth: ${depth}) brought in through: ${uniqueRoots.join(', ')}.`;
        }
        lines.push(`  ${summary}`);
      } else {
        // Found but no marketplace path
        lines.push(`  ${chalk.yellow('No marketplace module found (orphan dependency)')}`);
      }
    } else {
      // Not found
      lines.push(chalk.red('✗') + ` ${chalk.bold(result.dependency)}`);
      lines.push(`  ${chalk.gray(result.error || 'Not found')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format batch results as CSV
 */
export function formatBatchCsv(results: BatchTraceResult[]): string {
  const lines: string[] = [];

  // Header
  lines.push('Dependency,Found,Marketplace Module,Module Version,Path Count,Status');

  // Data rows
  for (const result of results) {
    const dependency = escapeCsv(result.dependency);

    if (result.found && result.result) {
      const completePaths = result.result.paths.filter(p => p.isComplete);

      if (completePaths.length > 0) {
        const firstPath = completePaths[0];
        const root = firstPath.components[firstPath.components.length - 1];
        const moduleName = escapeCsv(root.name);
        const moduleVersion = escapeCsv(root.version || '');

        lines.push(`${dependency},Yes,${moduleName},${moduleVersion},${completePaths.length},Found in marketplace module`);
      } else {
        lines.push(`${dependency},Yes,,,0,Orphan dependency (no marketplace module)`);
      }
    } else {
      const error = escapeCsv(result.error || 'Not found');
      lines.push(`${dependency},No,,,,${error}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format batch results as JSON
 */
export function formatBatchJson(results: BatchTraceResult[], summary: BatchSummary): string {
  const output = {
    summary,
    results: results.map(result => {
      if (result.found && result.result) {
        const completePaths = result.result.paths.filter(p => p.isComplete);

        return {
          dependency: result.dependency,
          found: true,
          target: {
            name: result.result.target.name,
            version: result.result.target.version,
            type: result.result.target.type,
            purl: result.result.target.purl,
          },
          marketplaceModules: completePaths.map(path => {
            const root = path.components[path.components.length - 1];
            return {
              name: root.name,
              version: root.version,
              purl: root.purl,
              pathLength: path.components.length,
            };
          }),
          pathCount: completePaths.length,
        };
      } else {
        return {
          dependency: result.dependency,
          found: false,
          error: result.error,
        };
      }
    }),
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Escape CSV values
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
