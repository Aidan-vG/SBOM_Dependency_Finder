import { describe, it, expect, beforeAll } from 'vitest';
import { parseSbomFile } from '../../src/sbom/parser.js';
import { buildGraph, searchComponents, getDependents, traceToRoot } from '../../src/sbom/graph.js';
import type { ParsedSbom } from '../../src/sbom/types.js';

describe('Graph operations', () => {
  let graph: ParsedSbom;

  beforeAll(() => {
    const sbom = parseSbomFile('test/fixtures/sample-sbom.json');
    graph = buildGraph(sbom);
  });

  describe('buildGraph', () => {
    it('should build componentsByRef map', () => {
      expect(graph.componentsByRef.size).toBe(9);
      expect(graph.componentsByRef.has('pkg:mendix/CommunityCommons@4.1.0?type=framework')).toBe(true);
    });

    it('should build componentsByName map', () => {
      expect(graph.componentsByName.size).toBeGreaterThan(0);
      expect(graph.componentsByName.has('communitycommons')).toBe(true);
    });

    it('should identify root components', () => {
      expect(graph.rootComponents.length).toBe(2);
      const rootNames = graph.rootComponents.map(c => c.name);
      expect(rootNames).toContain('CommunityCommons');
      expect(rootNames).toContain('EmailTemplate');
    });

    it('should build forward dependency map', () => {
      const deps = graph.forwardDeps.get('pkg:mendix/CommunityCommons@4.1.0?type=framework');
      expect(deps).toBeDefined();
      expect(deps?.length).toBe(2);
    });

    it('should build reverse dependency map', () => {
      const dependents = graph.reverseDeps.get('pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar');
      expect(dependents).toBeDefined();
      expect(dependents).toContain('pkg:mendix/CommunityCommons@4.1.0?type=framework');
    });
  });

  describe('searchComponents', () => {
    it('should find exact matches', () => {
      const results = searchComponents(graph, 'commons-lang3');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('commons-lang3');
      expect(results[0].score).toBe(100);
    });

    it('should find substring matches', () => {
      const results = searchComponents(graph, 'commons');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.name.includes('commons'))).toBe(true);
    });

    it('should return empty array for no matches', () => {
      const results = searchComponents(graph, 'nonexistent-library-xyz');
      expect(results).toHaveLength(0);
    });

    it('should filter by type', () => {
      const results = searchComponents(graph, 'commons', { typeFilter: 'library' });
      expect(results.every(r => r.type === 'library')).toBe(true);
    });

    it('should respect limit', () => {
      const results = searchComponents(graph, 'a', { limit: 3 });
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getDependents', () => {
    it('should return components that depend on a given component', () => {
      const dependents = getDependents(graph, 'pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar');
      expect(dependents.length).toBe(1);
      expect(dependents[0].name).toBe('CommunityCommons');
    });

    it('should return correct number of dependents for leaf components', () => {
      // jackson-core is depended on by jackson-databind only
      const dependents = getDependents(graph, 'pkg:maven/com.fasterxml.jackson.core/jackson-core@2.15.2?type=jar');
      expect(dependents).toHaveLength(1);
      expect(dependents[0].name).toBe('jackson-databind');
    });
  });

  describe('traceToRoot', () => {
    it('should trace a transitive dependency to root', () => {
      const result = traceToRoot(graph, 'pkg:maven/org.apache.commons/commons-text@1.10.0?type=jar');
      expect(result.target.name).toBe('commons-text');
      expect(result.paths.length).toBeGreaterThan(0);
      expect(result.paths[0].isComplete).toBe(true);

      // Check the path structure: commons-text -> commons-lang3 -> CommunityCommons
      const path = result.paths[0];
      expect(path.components.length).toBe(3);
      expect(path.components[0].name).toBe('commons-text');
      expect(path.components[1].name).toBe('commons-lang3');
      expect(path.components[2].name).toBe('CommunityCommons');
    });

    it('should trace a direct dependency to root', () => {
      const result = traceToRoot(graph, 'pkg:maven/com.google.guava/guava@32.0.1-jre?type=jar');
      expect(result.target.name).toBe('guava');
      expect(result.paths.length).toBe(1);
      expect(result.paths[0].components.length).toBe(2); // guava -> CommunityCommons
    });

    it('should handle root components', () => {
      const result = traceToRoot(graph, 'pkg:mendix/CommunityCommons@4.1.0?type=framework');
      expect(result.target.name).toBe('CommunityCommons');
      expect(result.paths.length).toBe(1);
      expect(result.paths[0].components.length).toBe(1);
      expect(result.paths[0].isComplete).toBe(true);
    });

    it('should throw error for non-existent component', () => {
      expect(() => traceToRoot(graph, 'non-existent-ref')).toThrow('Component not found');
    });
  });
});
