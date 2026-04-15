import * as fs from 'fs';
import type { ParsedSbom, TraceResult } from './sbom/types.js';
import { searchComponents, traceToRoot } from './sbom/graph.js';

export interface BatchTraceResult {
  dependency: string;
  found: boolean;
  result?: TraceResult;
  error?: string;
}

export interface BatchSummary {
  total: number;
  found: number;
  notFound: number;
  withMarketplacePaths: number;
  withoutMarketplacePaths: number;
}

/**
 * Read dependency names from a file (one per line)
 */
export function readDependencyList(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dependency list file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#')); // Skip empty lines and comments
}

/**
 * Trace multiple dependencies in batch
 */
export function traceBatch(
  graph: ParsedSbom,
  dependencies: string[],
  onProgress?: (current: number, total: number, dependency: string) => void
): BatchTraceResult[] {
  const results: BatchTraceResult[] = [];

  for (let i = 0; i < dependencies.length; i++) {
    const dependency = dependencies[i];

    if (onProgress) {
      onProgress(i + 1, dependencies.length, dependency);
    }

    try {
      // Search for the dependency
      const searchResults = searchComponents(graph, dependency, { limit: 1 });

      if (searchResults.length === 0) {
        results.push({
          dependency,
          found: false,
          error: 'No matching component found',
        });
        continue;
      }

      // Trace the best match
      const bestMatch = searchResults[0];
      const traceResult = traceToRoot(graph, bestMatch.bomRef);

      results.push({
        dependency,
        found: true,
        result: traceResult,
      });
    } catch (error) {
      results.push({
        dependency,
        found: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Generate summary statistics from batch results
 */
export function generateBatchSummary(results: BatchTraceResult[]): BatchSummary {
  const summary: BatchSummary = {
    total: results.length,
    found: 0,
    notFound: 0,
    withMarketplacePaths: 0,
    withoutMarketplacePaths: 0,
  };

  for (const result of results) {
    if (result.found) {
      summary.found++;

      if (result.result) {
        const completePaths = result.result.paths.filter(p => p.isComplete);
        if (completePaths.length > 0) {
          summary.withMarketplacePaths++;
        } else {
          summary.withoutMarketplacePaths++;
        }
      }
    } else {
      summary.notFound++;
    }
  }

  return summary;
}
