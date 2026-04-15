import type {
  SbomDocument,
  SbomComponent,
  ParsedSbom,
  ComponentSearchResult,
  DependencyPath,
  TraceResult,
} from './types.js';
import { isMendixMarketplaceComponent } from './parser.js';

/**
 * Build indexed data structures from an SBOM document for efficient querying
 */
export function buildGraph(document: SbomDocument): ParsedSbom {
  const componentsByRef = new Map<string, SbomComponent>();
  const componentsByName = new Map<string, SbomComponent[]>();
  const forwardDeps = new Map<string, string[]>();
  const reverseDeps = new Map<string, string[]>();

  // Include metadata.component if it exists (the main app/subject of the SBOM)
  const allComponents = [...document.components];
  if (document.metadata?.component) {
    allComponents.push(document.metadata.component as SbomComponent);
  }

  // Index components by bom-ref, purl, and name
  for (const component of allComponents) {
    const bomRef = component['bom-ref'];
    componentsByRef.set(bomRef, component);

    // Also index by purl if it exists (for SBOM inconsistencies where dependencies use purl as ref)
    if (component.purl) {
      componentsByRef.set(component.purl, component);

      // Handle HTML-encoded ampersands in purls (&amp; -> &)
      const decodedPurl = component.purl.replace(/&amp;/g, '&');
      if (decodedPurl !== component.purl) {
        componentsByRef.set(decodedPurl, component);
      }

      // Some SBOMs use shortened purls in dependencies (missing some query params)
      // Index by purl without appstorepackageid parameter
      const simplifiedPurl = component.purl
        .replace(/&amp;/g, '&')
        .replace(/&appstorepackageid=\d+/g, '')
        .replace(/\?appstorepackageid=\d+&/, '?');
      if (simplifiedPurl !== component.purl && simplifiedPurl !== decodedPurl) {
        componentsByRef.set(simplifiedPurl, component);
      }
    }

    // Index by lowercase name for case-insensitive search
    const nameLower = component.name.toLowerCase();
    const existing = componentsByName.get(nameLower) || [];
    existing.push(component);
    componentsByName.set(nameLower, existing);
  }

  // Build forward dependency map (ref -> what it depends on)
  for (const dep of document.dependencies) {
    const ref = dep.ref;
    const dependsOn = dep.dependsOn || [];
    forwardDeps.set(ref, dependsOn);

    // Build reverse dependency map (ref -> what depends on it)
    for (const targetRef of dependsOn) {
      const existing = reverseDeps.get(targetRef) || [];
      existing.push(ref);
      reverseDeps.set(targetRef, existing);
    }
  }

  // Identify root components (marketplace modules with no dependents)
  const rootComponents: SbomComponent[] = [];
  for (const component of allComponents) {
    if (!isMendixMarketplaceComponent(component)) {
      continue;
    }

    // Check all possible identifiers (bom-ref, purl, decoded purl)
    const bomRef = component['bom-ref'];
    const purl = component.purl;
    const decodedPurl = purl?.replace(/&amp;/g, '&');

    const hasDependents =
      (reverseDeps.has(bomRef) && reverseDeps.get(bomRef)!.length > 0) ||
      (purl && reverseDeps.has(purl) && reverseDeps.get(purl)!.length > 0) ||
      (decodedPurl && decodedPurl !== purl && reverseDeps.has(decodedPurl) && reverseDeps.get(decodedPurl)!.length > 0);

    if (!hasDependents) {
      rootComponents.push(component);
    }
  }

  return {
    document,
    componentsByRef,
    componentsByName,
    forwardDeps,
    reverseDeps,
    rootComponents,
  };
}

/**
 * Search for components by name using fuzzy matching
 */
export function searchComponents(
  graph: ParsedSbom,
  query: string,
  options?: {
    typeFilter?: "framework" | "library" | "all";
    limit?: number;
  }
): ComponentSearchResult[] {
  const limit = options?.limit || 15;
  const typeFilter = options?.typeFilter || "all";
  const queryLower = query.toLowerCase();
  const results: ComponentSearchResult[] = [];

  // First pass: exact and substring matches
  for (const [nameLower, components] of graph.componentsByName) {
    for (const component of components) {
      // Apply type filter
      if (typeFilter !== "all" && component.type !== typeFilter) {
        continue;
      }

      let score = 0;

      // Exact match (case-insensitive)
      if (nameLower === queryLower) {
        score = 100;
      }
      // Starts with query
      else if (nameLower.startsWith(queryLower)) {
        score = 80;
      }
      // Contains query
      else if (nameLower.includes(queryLower)) {
        score = 60;
      }
      // Check if version matches
      else if (component.version && component.version.toLowerCase().includes(queryLower)) {
        score = 40;
      }
      // Check purl for group ID match (e.g., "org.apache.commons")
      else if (component.purl && component.purl.toLowerCase().includes(queryLower)) {
        score = 50;
      }
      // No match
      else {
        continue;
      }

      results.push({
        name: component.name,
        version: component.version,
        type: component.type,
        purl: component.purl,
        bomRef: component['bom-ref'],
        score,
      });
    }
  }

  // Second pass: Levenshtein distance for fuzzy matches if we don't have enough results
  if (results.length < 5) {
    for (const component of graph.document.components) {
      // Skip if already in results
      if (results.some(r => r.bomRef === component['bom-ref'])) {
        continue;
      }

      // Apply type filter
      if (typeFilter !== "all" && component.type !== typeFilter) {
        continue;
      }

      const distance = levenshteinDistance(queryLower, component.name.toLowerCase());
      const maxLen = Math.max(queryLower.length, component.name.length);
      const similarity = 1 - distance / maxLen;

      // Only include if similarity is above threshold
      if (similarity > 0.6) {
        results.push({
          name: component.name,
          version: component.version,
          type: component.type,
          purl: component.purl,
          bomRef: component['bom-ref'],
          score: Math.round(similarity * 50), // Scale to 0-50 for fuzzy matches
        });
      }
    }
  }

  // Sort by score (descending) and limit
  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return results.slice(0, limit);
}

/**
 * Get all components that depend on a given component (one level up)
 */
export function getDependents(graph: ParsedSbom, bomRef: string): SbomComponent[] {
  const dependentRefs = graph.reverseDeps.get(bomRef) || [];
  const dependents: SbomComponent[] = [];

  for (const ref of dependentRefs) {
    const component = graph.componentsByRef.get(ref);
    if (component) {
      dependents.push(component);
    }
  }

  return dependents;
}

/**
 * Get all components that a given component depends on (one level down)
 */
export function getDependencies(graph: ParsedSbom, bomRef: string): SbomComponent[] {
  const dependencyRefs = graph.forwardDeps.get(bomRef) || [];
  const dependencies: SbomComponent[] = [];

  for (const ref of dependencyRefs) {
    const component = graph.componentsByRef.get(ref);
    if (component) {
      dependencies.push(component);
    }
  }

  return dependencies;
}

/**
 * Trace all paths from a target component up to root marketplace modules
 */
export function traceToRoot(graph: ParsedSbom, bomRef: string): TraceResult {
  const target = graph.componentsByRef.get(bomRef);
  if (!target) {
    throw new Error(`Component not found: ${bomRef}`);
  }

  const paths: DependencyPath[] = [];
  const queue: Array<{ path: string[]; visited: Set<string> }> = [
    { path: [bomRef], visited: new Set([bomRef]) }
  ];

  const maxIterations = 1000; // Safety limit
  let iterations = 0;

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++;
    const current = queue.shift()!;
    const currentRef = current.path[current.path.length - 1];
    const currentComponent = graph.componentsByRef.get(currentRef);

    // Skip if component doesn't exist (dangling reference in dependencies)
    if (!currentComponent) {
      console.warn(`Warning: Component reference not found: ${currentRef}`);
      continue;
    }

    // Check if we've reached a root (marketplace module with no dependents)
    const isRoot = isMendixMarketplaceComponent(currentComponent) &&
                   (!graph.reverseDeps.has(currentRef) || graph.reverseDeps.get(currentRef)!.length === 0);

    if (isRoot) {
      // Found a complete path - filter out any missing components
      const components = current.path
        .map(ref => graph.componentsByRef.get(ref))
        .filter((c): c is SbomComponent => c !== undefined);
      paths.push({
        components,
        isComplete: true,
      });
      continue;
    }

    // Get parents (components that depend on this one)
    const parents = graph.reverseDeps.get(currentRef) || [];

    if (parents.length === 0) {
      // Orphan path - no parent, but not a marketplace root
      const components = current.path
        .map(ref => graph.componentsByRef.get(ref))
        .filter((c): c is SbomComponent => c !== undefined);
      paths.push({
        components,
        isComplete: false,
      });
      continue;
    }

    // Explore each parent
    for (const parentRef of parents) {
      // Cycle detection
      if (current.visited.has(parentRef)) {
        continue;
      }

      const newVisited = new Set(current.visited);
      newVisited.add(parentRef);

      queue.push({
        path: [...current.path, parentRef],
        visited: newVisited,
      });
    }
  }

  if (iterations >= maxIterations) {
    console.warn('Warning: Maximum iterations reached during graph traversal. Results may be incomplete.');
  }

  return {
    target,
    paths,
  };
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
