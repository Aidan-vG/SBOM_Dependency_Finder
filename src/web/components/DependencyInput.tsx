import React, { useState } from 'react';
import type { ParsedSbom, ComponentSearchResult } from '../../sbom/types';
import { searchComponents } from '../../sbom/graph';
import TraceResults from './TraceResults';
import BatchResults from './BatchResults';

interface DependencyInputProps {
  graph: ParsedSbom;
}

type Mode = 'single' | 'batch';

function DependencyInput({ graph }: DependencyInputProps) {
  const [mode, setMode] = useState<Mode>('single');
  const [singleInput, setSingleInput] = useState('');
  const [searchResults, setSearchResults] = useState<ComponentSearchResult[]>([]);
  const [batchInput, setBatchInput] = useState('');
  const [selectedBomRef, setSelectedBomRef] = useState<string | null>(null);
  const [batchDeps, setBatchDeps] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSingleInput(newQuery);
    setError(null);

    // Live search as user types (minimum 2 characters)
    if (newQuery.trim().length >= 2) {
      const results = searchComponents(graph, newQuery.trim(), { limit: 10 });
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectResult = (bomRef: string) => {
    setSelectedBomRef(bomRef);
    setSearchResults([]);
  };

  const handleSingleTrace = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!singleInput.trim()) {
      setError('Please enter a dependency name');
      return;
    }

    const results = searchComponents(graph, singleInput.trim(), { limit: 1 });
    if (results.length === 0) {
      setError(`No component found matching "${singleInput}"`);
      return;
    }

    setSelectedBomRef(results[0].bomRef);
    setSearchResults([]);
  };

  const handleBatchTrace = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!batchInput.trim()) {
      setError('Please enter at least one dependency name');
      return;
    }

    const deps = batchInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    if (deps.length === 0) {
      setError('No valid dependencies found (empty lines and # comments are ignored)');
      return;
    }

    setBatchDeps(deps);
  };

  const handleReset = () => {
    setSelectedBomRef(null);
    setBatchDeps(null);
    setError(null);
    setSingleInput('');
    setSearchResults([]);
  };

  return (
    <div className="dependency-input">
      <div className="mode-tabs">
        <button
          className={`tab ${mode === 'single' ? 'active' : ''}`}
          onClick={() => {
            setMode('single');
            handleReset();
          }}
        >
          Single Dependency
        </button>
        <button
          className={`tab ${mode === 'batch' ? 'active' : ''}`}
          onClick={() => {
            setMode('batch');
            handleReset();
          }}
        >
          Batch Trace
        </button>
      </div>

      {mode === 'single' && !selectedBomRef && (
        <div className="trace-form">
          <label>
            Dependency Name
            <input
              type="text"
              value={singleInput}
              onChange={handleSingleInputChange}
              placeholder="e.g., commons-lang3, log4j-core"
              className="trace-input"
            />
          </label>

          {singleInput.trim().length >= 2 && searchResults.length === 0 && (
            <div className="search-results">
              <div className="no-results">
                No components found matching "{singleInput}"
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Search Results ({searchResults.length})</h3>
              <div className="results-list">
                {searchResults.map((result) => (
                  <div
                    key={result.bomRef}
                    className="result-item"
                    onClick={() => handleSelectResult(result.bomRef)}
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
        </div>
      )}

      {mode === 'batch' && !batchDeps && (
        <form onSubmit={handleBatchTrace} className="trace-form">
          <label>
            Dependency List (one per line)
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={'commons-text\nlog4j-core\njackson-databind\n# Lines starting with # are ignored'}
              rows={8}
              className="trace-textarea"
            />
          </label>
          <button type="submit" className="btn-primary">
            Trace All Dependencies
          </button>
        </form>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {selectedBomRef && (
        <div className="trace-container">
          <button onClick={handleReset} className="btn-secondary btn-back">
            ← New Trace
          </button>
          <TraceResults graph={graph} bomRef={selectedBomRef} />
        </div>
      )}

      {batchDeps && (
        <div className="trace-container">
          <button onClick={handleReset} className="btn-secondary btn-back">
            ← New Batch Trace
          </button>
          <BatchResults graph={graph} dependencies={batchDeps} />
        </div>
      )}
    </div>
  );
}

export default DependencyInput;
