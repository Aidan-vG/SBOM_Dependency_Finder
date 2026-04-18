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

  const exportCSV = () => {
    const header = 'Dependency,Found,Marketplace Module,Module Version,Path Count,Status\n';
    const rows = results.map((r) => {
      if (!r.found || !r.result) {
        return `"${r.dependency}",No,,,0,"${r.error || 'Not found'}"`;
      }

      const completePaths = r.result.paths.filter(p => p.isComplete);
      if (completePaths.length === 0) {
        return `"${r.dependency}",Yes,,,0,"No marketplace paths"`;
      }

      // Get the marketplace module (last component in path)
      const marketplaceModule = completePaths[0].components[completePaths[0].components.length - 1];
      const moduleName = marketplaceModule.name;
      const moduleVersion = marketplaceModule.version || '';

      return `"${r.dependency}",Yes,"${moduleName}","${moduleVersion}",${completePaths.length},"Complete"`;
    });

    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-trace-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const json = JSON.stringify(results, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-trace-results.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const extractMarketplaceId = (purl: string | undefined): string | null => {
    if (!purl) return null;
    const match = purl.match(/appstorepackageid=(\d+)/);
    return match ? match[1] : null;
  };

  const generateSummaryLine = (result: typeof results[0]): { text: string; marketplaceId: string | null; moduleName: string | null } | null => {
    if (!result.found || !result.result) {
      return { text: `${result.dependency}: Not found in SBOM`, marketplaceId: null, moduleName: null };
    }

    const completePaths = result.result.paths.filter(p => p.isComplete);
    if (completePaths.length === 0) {
      return { text: `${result.dependency}: No marketplace module found (orphan dependency)`, marketplaceId: null, moduleName: null };
    }

    const firstPath = completePaths[0];
    // Get the marketplace module (last component in path, since path goes from target to root)
    const root = firstPath.components[firstPath.components.length - 1];
    const moduleName = root.name;
    const moduleVersion = root.version ? ` v${root.version}` : '';
    const marketplaceId = extractMarketplaceId(root.purl);

    if (firstPath.components.length === 1) {
      return {
        text: `${result.dependency}: Root marketplace module itself`,
        marketplaceId,
        moduleName,
      };
    } else if (firstPath.components.length === 2) {
      return {
        text: `${result.dependency}: Direct dependency of ${moduleName}${moduleVersion}`,
        marketplaceId,
        moduleName,
      };
    } else {
      const depth = firstPath.components.length - 2;
      return {
        text: `${result.dependency}: Transitive dependency (depth ${depth}) of ${moduleName}${moduleVersion}`,
        marketplaceId,
        moduleName,
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

        <div className="export-buttons">
          <button onClick={exportCSV} className="btn-secondary">
            Export CSV
          </button>
          <button onClick={exportJSON} className="btn-secondary">
            Export JSON
          </button>
        </div>
      </div>

      <div className="batch-summary-section">
        <h3>Summary</h3>
        <div className="summary-list">
          {results.map((result) => {
            const summaryLine = generateSummaryLine(result);
            if (!summaryLine) return null;

            return (
              <div key={result.dependency} className="summary-line">
                <span className="summary-text">{summaryLine.text}</span>
                {summaryLine.marketplaceId && summaryLine.moduleName && (
                  <a
                    href={`https://marketplace.mendix.com/link/component/${summaryLine.marketplaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="marketplace-link"
                  >
                    View in Marketplace →
                  </a>
                )}
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
