import React from 'react';
import type { ParsedSbom } from '../../sbom/types';
import { traceToRoot } from '../../sbom/graph';
import { getComponentDisplayName } from '../../sbom/parser';
import PathTree from './PathTree';

interface TraceResultsProps {
  graph: ParsedSbom;
  bomRef: string;
}

function TraceResults({ graph, bomRef }: TraceResultsProps) {
  const result = traceToRoot(graph, bomRef);

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

      {result.paths.filter(p => p.isComplete).length > 0 && (
        <div className="paths-section">
          <h3>Dependency Paths to Marketplace Modules</h3>
          {result.paths
            .filter(p => p.isComplete)
            .map((path, idx) => (
              <PathTree key={idx} path={path} targetBomRef={bomRef} />
            ))}
        </div>
      )}

      {result.paths.filter(p => !p.isComplete).length > 0 && (
        <div className="paths-section incomplete">
          <h3>Incomplete Paths (No Marketplace Module Found)</h3>
          {result.paths
            .filter(p => !p.isComplete)
            .map((path, idx) => (
              <PathTree key={idx} path={path} targetBomRef={bomRef} />
            ))}
        </div>
      )}

      {result.summary && (
        <div className="summary">
          <strong>Summary:</strong> {result.summary}
        </div>
      )}
    </div>
  );
}

export default TraceResults;
