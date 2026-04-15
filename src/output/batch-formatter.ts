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

  // Results table
  lines.push(chalk.bold('Detailed Results:\n'));

  for (const result of results) {
    if (result.found && result.result) {
      const completePaths = result.result.paths.filter(p => p.isComplete);

      if (completePaths.length > 0) {
        // Found with marketplace path
        const firstPath = completePaths[0];
        const root = firstPath.components[firstPath.components.length - 1];
        const rootName = root.version ? `${root.name} v${root.version}` : root.name;

        lines.push(chalk.green('✓') + ` ${chalk.bold(result.dependency)}`);
        lines.push(`  → ${chalk.blue(rootName)} (${completePaths.length} path${completePaths.length === 1 ? '' : 's'})`);
      } else {
        // Found but no marketplace path
        lines.push(chalk.yellow('⚠') + ` ${chalk.bold(result.dependency)}`);
        lines.push(`  → ${chalk.yellow('No marketplace module found (orphan dependency)')}`);
      }
    } else {
      // Not found
      lines.push(chalk.red('✗') + ` ${chalk.bold(result.dependency)}`);
      lines.push(`  → ${chalk.gray(result.error || 'Not found')}`);
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
