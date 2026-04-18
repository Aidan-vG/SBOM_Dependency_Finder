import React, { useState } from 'react';
import type { ParsedSbom, ComponentSearchResult } from '../../sbom/types';
import { searchComponents } from '../../sbom/graph';
import TraceResults from './TraceResults';

interface SearchPanelProps {
  graph: ParsedSbom;
}

function SearchPanel({ graph }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComponentSearchResult[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedComponent(null);

    // Live search as user types (minimum 2 characters)
    if (newQuery.trim().length >= 2) {
      const searchResults = searchComponents(graph, newQuery.trim(), { limit: 10 });
      setResults(searchResults);
    } else if (newQuery.trim().length === 0) {
      setResults([]);
    }
  };

  const handleSelectComponent = (bomRef: string) => {
    setSelectedComponent(bomRef);
  };

  return (
    <div className="search-panel">
      <h2>Search Components</h2>

      <div className="search-form">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name (e.g., commons-lang3, log4j-core)"
          className="search-input"
        />
      </div>

      {query.trim().length >= 2 && results.length === 0 && !selectedComponent && (
        <div className="search-results">
          <div className="no-results">
            No components found matching "{query}"
          </div>
        </div>
      )}

      {results.length > 0 && !selectedComponent && (
        <div className="search-results">
          <h3>Search Results ({results.length})</h3>
          <div className="results-list">
            {results.map((result) => (
              <div
                key={result.bomRef}
                className="result-item"
                onClick={() => handleSelectComponent(result.bomRef)}
              >
                <div className="result-header">
                  <span className="result-name">{result.name}</span>
                  {result.version && <span className="result-version">v{result.version}</span>}
                  <span className={`badge badge-${result.type}`}>{result.type}</span>
                </div>
                {result.purl && <div className="result-purl">{result.purl}</div>}
                <div className="result-score">Relevance: {result.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedComponent && (
        <div className="trace-container">
          <button
            onClick={() => setSelectedComponent(null)}
            className="btn-secondary btn-back"
          >
            ← Back to Results
          </button>
          <TraceResults graph={graph} bomRef={selectedComponent} />
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
