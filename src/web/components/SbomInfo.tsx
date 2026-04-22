import React from 'react';
import type { SbomDocument, ParsedSbom } from '../../sbom/types';
import { isMendixMarketplaceComponent } from '../../sbom/parser';

interface SbomInfoProps {
  sbom: SbomDocument;
  graph: ParsedSbom;
}

function SbomInfo({ sbom, graph }: SbomInfoProps) {
  // Count components by semantic type (module for marketplace, otherwise raw type)
  const componentsByType = sbom.components.reduce((acc, comp) => {
    const type = isMendixMarketplaceComponent(comp) ? 'module' : comp.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rootComponents = graph.rootComponents.map(ref => graph.componentsByRef.get(ref)!);
  const marketplaceModules = rootComponents.filter(isMendixMarketplaceComponent);

  return (
    <div className="sbom-info">
      <h2>SBOM Information</h2>

      <div className="info-grid">
        <div className="info-card">
          <div className="info-label">Format</div>
          <div className="info-value">{sbom.bomFormat}</div>
        </div>

        <div className="info-card">
          <div className="info-label">Version</div>
          <div className="info-value">{sbom.specVersion}</div>
        </div>

        <div className="info-card">
          <div className="info-label">Total Components</div>
          <div className="info-value">{sbom.components.length}</div>
        </div>

        <div className="info-card">
          <div className="info-label">Dependencies</div>
          <div className="info-value">{sbom.dependencies?.length || 0}</div>
        </div>
      </div>

      <div className="info-section">
        <h3>Components by Type</h3>
        <div className="type-list">
          {Object.entries(componentsByType).map(([type, count]) => (
            <div key={type} className="type-item">
              <span className={`badge badge-${type}`}>{type}</span>
              <span className="count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {marketplaceModules.length > 0 && (
        <div className="info-section">
          <h3>Marketplace Modules ({marketplaceModules.length})</h3>
          <div className="module-list">
            {marketplaceModules.map((module) => (
              <div key={module['bom-ref']} className="module-item">
                <span className="module-name">{module.name}</span>
                {module.version && <span className="module-version">v{module.version}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SbomInfo;
