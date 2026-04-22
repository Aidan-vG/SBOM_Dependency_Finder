import React, { useState } from 'react';
import type { SbomDocument, ParsedSbom } from '../sbom/types';
import { parseSbomJson } from '../sbom/parser';
import { buildGraph } from '../sbom/graph';
import FileUpload from './components/FileUpload';
import SbomInfo from './components/SbomInfo';
import DependencyInput from './components/DependencyInput';

type AppState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'ready'; sbom: SbomDocument; graph: ParsedSbom; fileName: string };

function App() {
  const [state, setState] = useState<AppState>({ status: 'idle' });

  const handleFileLoad = async (file: File) => {
    try {
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('File is too large (>100MB). Please check that this is the correct file.');
      }

      const text = await file.text();
      const data = JSON.parse(text);
      const sbom = parseSbomJson(data);
      const graph = buildGraph(sbom);

      setState({
        status: 'ready',
        sbom,
        graph,
        fileName: file.name
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        setState({ status: 'error', error: `Invalid JSON: ${error.message}` });
      } else if (error instanceof Error) {
        setState({ status: 'error', error: error.message });
      } else {
        setState({ status: 'error', error: 'An unknown error occurred' });
      }
    }
  };

  const handleReset = () => {
    setState({ status: 'idle' });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>SBOM Dependency Finder</h1>
        <p>Trace JAR dependencies to their parent Mendix Marketplace modules</p>
      </header>

      <main className="app-main">
        {state.status === 'idle' && (
          <FileUpload onFileLoad={handleFileLoad} />
        )}

        {state.status === 'error' && (
          <div className="error-banner">
            <h2>Error Loading SBOM</h2>
            <p>{state.error}</p>
            <button onClick={handleReset} className="btn-primary">
              Try Another File
            </button>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            <div className="toolbar">
              <div className="file-info">
                <span className="label">Loaded:</span>
                <span className="filename">{state.fileName}</span>
              </div>
              <button onClick={handleReset} className="btn-secondary">
                Load Different File
              </button>
            </div>

            <SbomInfo sbom={state.sbom} graph={state.graph} />

            <div className="divider" />

            <DependencyInput graph={state.graph} />
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          <a href="https://github.com/Aidan-vG/SBOM_Dependency_Finder" target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
