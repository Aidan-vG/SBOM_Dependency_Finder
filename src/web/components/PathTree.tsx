import React from 'react';
import type { DependencyPath } from '../../sbom/types';
import { getComponentDisplayName, isMendixMarketplaceComponent, isJarLibrary } from '../../sbom/parser';

interface PathTreeProps {
  path: DependencyPath;
  targetBomRef: string;
}

function PathTree({ path, targetBomRef }: PathTreeProps) {
  const getComponentClass = (component: typeof path.components[0]) => {
    if (isMendixMarketplaceComponent(component)) return 'marketplace';
    if (isJarLibrary(component)) return 'jar';
    return 'other';
  };

  return (
    <div className="path-tree">
      {path.components.map((component, idx) => {
        const isTarget = component['bom-ref'] === targetBomRef;
        const isLast = idx === path.components.length - 1;
        const componentClass = getComponentClass(component);

        return (
          <div key={idx} className={`tree-node ${isTarget ? 'target' : ''}`}>
            {idx > 0 && <div className="tree-connector" />}
            <div className={`component-item ${componentClass}`}>
              <span className="component-name">{getComponentDisplayName(component)}</span>
              <span className={`badge badge-${component.type}`}>{component.type}</span>
              {isTarget && <span className="target-marker">← Target</span>}
            </div>
            {!isLast && <div className="tree-arrow">↓</div>}
          </div>
        );
      })}
    </div>
  );
}

export default PathTree;
