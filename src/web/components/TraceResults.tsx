import React, { useState } from 'react';
import type { ParsedSbom } from '../../sbom/types';
import { traceToRoot } from '../../sbom/graph';
import { getComponentDisplayName } from '../../sbom/parser';
import PathTree from './PathTree';

interface TraceResultsProps {
  graph: ParsedSbom;
  bomRef: string;
}

function TraceResults({ graph, bomRef }: TraceResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const result = traceToRoot(graph, bomRef);

  const extractMarketplaceId = (purl: string | undefined): string | null => {
    if (!purl) return null;
    const match = purl.match(/appstorepackageid=(\d+)/);
    return match ? match[1] : null;
  };

  const generateSummaryLine = (): { prefix: string; moduleName: string | null; moduleVersion: string; marketplaceId: string | null } | { text: string } => {
    const completePaths = result.paths.filter(p => p.isComplete);
    const dependencyName = getComponentDisplayName(result.target);

    if (completePaths.length === 0) {
      return { text: `${dependencyName}: No marketplace module found (orphan dependency)` };
    }

    const firstPath = completePaths[0];
    // Get the marketplace module (last component in path, since path goes from target to root)
    const root = firstPath.components[firstPath.components.length - 1];
    const moduleName = root.name;
    const moduleVersion = root.version ? ` v${root.version}` : '';
    const marketplaceId = extractMarketplaceId(root.purl);

    if (firstPath.components.length === 1) {
      return {
        prefix: `${dependencyName}: Root marketplace module itself`,
        moduleName: null,
        moduleVersion: '',
        marketplaceId,
      };
    } else if (firstPath.components.length === 2) {
      return {
        prefix: `${dependencyName}: Direct dependency of `,
        moduleName,
        moduleVersion,
        marketplaceId,
      };
    } else {
      const depth = firstPath.components.length - 2;
      return {
        prefix: `${dependencyName}: Transitive dependency (depth ${depth}) of `,
        moduleName,
        moduleVersion,
        marketplaceId,
      };
    }
  };

  const summaryLine = generateSummaryLine();

  return (
    <div className="trace-results">
      <div className="target-component">
        <h3>Target Component</h3>
        <div className="component-card">
          <div className="component-name">{getComponentDisplayName(result.target)}</div>
          <div className={`badge badge-${result.target.type}`}>{result.target.type}</div>
          {result.target.purl && <div className="component-purl">{result.target.purl}</div>}
        </div>
      </div>

      <div className="single-summary-section">
        <h3>Summary</h3>
        {'text' in summaryLine ? (
          <div className="summary-line">
            <span className="summary-text">{summaryLine.text}</span>
          </div>
        ) : (
          <div className="summary-line">
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
        )}
      </div>

      <div className="detailed-results-section">
        <h3>Detailed Results</h3>
        <div className="batch-result-item">
          <div
            className="batch-result-header"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="dependency-name">{getComponentDisplayName(result.target)}</span>
            <span className="status-badge success">Found</span>
            {result.paths.filter(p => p.isComplete).length > 0 && (
              <span className="path-count">
                {result.paths.filter(p => p.isComplete).length} path(s)
              </span>
            )}
            <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
          </div>

          {isExpanded && (
            <div className="batch-result-details">
              {result.paths.filter(p => p.isComplete).length > 0 && (
                <div className="paths-section">
                  {result.paths
                    .filter(p => p.isComplete)
                    .map((path, idx) => (
                      <PathTree key={idx} path={path} targetBomRef={bomRef} />
                    ))}
                </div>
              )}

              {result.paths.filter(p => !p.isComplete).length > 0 && (
                <div className="paths-section incomplete">
                  <h4>Incomplete Paths (No Marketplace Module Found)</h4>
                  {result.paths
                    .filter(p => !p.isComplete)
                    .map((path, idx) => (
                      <PathTree key={idx} path={path} targetBomRef={bomRef} />
                    ))}
                </div>
              )}

              {result.summary && (
                <div className="result-summary">{result.summary}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TraceResults;
