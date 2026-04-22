import React, { useMemo, useState } from 'react';
import type { ParsedSbom } from '../../sbom/types';
import { traceBatch, generateBatchSummary } from '../../batch';
import PathTree from './PathTree';

interface BatchResultsProps {
  graph: ParsedSbom;
  dependencies: string[];
}

function BatchResults({ graph, dependencies }: BatchResultsProps) {
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set());

  const results = useMemo(() => traceBatch(graph, dependencies), [graph, dependencies]);
  const summary = useMemo(() => generateBatchSummary(results), [results]);

  const toggleExpanded = (dep: string) => {
    setExpandedDeps((prev) => {
      const next = new Set(prev);
      if (next.has(dep)) {
        next.delete(dep);
      } else {
        next.add(dep);
      }
      return next;
    });
  };

  const extractMarketplaceId = (purl: string | undefined): string | null => {
    if (!purl) return null;
    const match = purl.match(/appstorepackageid=(\d+)/);
    return match ? match[1] : null;
  };

  const generateSummaryLine = (result: typeof results[0]): { prefix: string; moduleName: string | null; moduleVersion: string; marketplaceId: string | null } | { text: string } => {
    if (!result.found || !result.result) {
      return { text: `${result.dependency}: Not found in SBOM` };
    }

    const completePaths = result.result.paths.filter(p => p.isComplete);
    if (completePaths.length === 0) {
      return { text: `${result.dependency}: No marketplace module found (orphan dependency)` };
    }

    const firstPath = completePaths[0];
    // Get the marketplace module (last component in path, since path goes from target to root)
    const root = firstPath.components[firstPath.components.length - 1];
    const moduleName = root.name;
    const moduleVersion = root.version ? ` v${root.version}` : '';
    const marketplaceId = extractMarketplaceId(root.purl);

    if (firstPath.components.length === 1) {
      return {
        prefix: `${result.dependency}: Root marketplace module itself`,
        moduleName: null,
        moduleVersion: '',
        marketplaceId,
      };
    } else if (firstPath.components.length === 2) {
      return {
        prefix: `${result.dependency}: Direct dependency of `,
        moduleName,
        moduleVersion,
        marketplaceId,
      };
    } else {
      const depth = firstPath.components.length - 2;
      return {
        prefix: `${result.dependency}: Transitive dependency (depth ${depth}) of `,
        moduleName,
        moduleVersion,
        marketplaceId,
      };
    }
  };

  return (
    <div className="batch-results">
      <div className="batch-summary">
        <h3>Batch Trace Summary</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total</span>
            <span className="summary-value">{summary.total}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Found</span>
            <span className="summary-value success">{summary.found}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Not Found</span>
            <span className="summary-value error">{summary.notFound}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">With Marketplace Paths</span>
            <span className="summary-value success">{summary.withMarketplacePaths}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Without Marketplace Paths</span>
            <span className="summary-value warning">{summary.withoutMarketplacePaths}</span>
          </div>
        </div>
      </div>

      <div className="batch-summary-section">
        <h3>Summary</h3>
        <div className="summary-list">
          {results.map((result) => {
            const summaryLine = generateSummaryLine(result);
            if (!summaryLine) return null;

            // Simple text-only line (not found or orphan)
            if ('text' in summaryLine) {
              return (
                <div key={result.dependency} className="summary-line">
                  <span className="summary-text">{summaryLine.text}</span>
                </div>
              );
            }

            // Line with module name as link
            return (
              <div key={result.dependency} className="summary-line">
                <span className="summary-text">
                  {summaryLine.prefix}
                  {summaryLine.moduleName && summaryLine.marketplaceId ? (
                    <a
                      href={`https://marketplace.mendix.com/link/component/${summaryLine.marketplaceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="marketplace-link-inline"
                    >
                      {summaryLine.moduleName}
                    </a>
                  ) : (
                    summaryLine.moduleName
                  )}
                  {summaryLine.moduleVersion}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="batch-details">
        <h3>Detailed Results</h3>
        {results.map((result) => {
          const isExpanded = expandedDeps.has(result.dependency);

          return (
            <div key={result.dependency} className="batch-result-item">
              <div
                className="batch-result-header"
                onClick={() => toggleExpanded(result.dependency)}
              >
                <span className="dependency-name">{result.dependency}</span>
                {result.found ? (
                  <>
                    <span className="status-badge success">Found</span>
                    {result.result && result.result.paths.filter(p => p.isComplete).length > 0 && (
                      <span className="path-count">
                        {result.result.paths.filter(p => p.isComplete).length} path(s)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="status-badge error">Not Found</span>
                )}
                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
              </div>

              {isExpanded && (
                <div className="batch-result-details">
                  {!result.found && (
                    <div className="error-message">{result.error}</div>
                  )}

                  {result.found && result.result && (
                    <>
                      {result.result.paths.filter(p => p.isComplete).length > 0 ? (
                        <div className="paths-section">
                          {result.result.paths
                            .filter(p => p.isComplete)
                            .map((path, idx) => (
                              <PathTree
                                key={idx}
                                path={path}
                                targetBomRef={result.result!.target['bom-ref']}
                              />
                            ))}
                        </div>
                      ) : (
                        <div className="warning-message">
                          Component found but no path to marketplace module
                        </div>
                      )}

                      {result.result.summary && (
                        <div className="result-summary">{result.result.summary}</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BatchResults;
