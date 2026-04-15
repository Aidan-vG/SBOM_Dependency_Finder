/**
 * TypeScript interfaces for CycloneDX 1.4 SBOM format
 */

export interface SbomDocument {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata?: SbomMetadata;
  components: SbomComponent[];
  dependencies: SbomDependency[];
}

export interface SbomMetadata {
  timestamp?: string;
  tools?: Array<{
    vendor?: string;
    name?: string;
    version?: string;
  }>;
  component?: SbomComponent;
  [key: string]: unknown;
}

export interface SbomComponent {
  type: "framework" | "library" | "application" | "container" | "operating-system" | "device" | "firmware" | "file";
  name: string;
  version?: string;
  "bom-ref": string;
  purl?: string;
  cpe?: string;
  description?: string;
  licenses?: SbomLicense[];
  hashes?: Array<{
    alg: string;
    content: string;
  }>;
  externalReferences?: Array<{
    type: string;
    url: string;
  }>;
  properties?: Array<{
    name: string;
    value: string;
  }>;
  [key: string]: unknown;
}

export interface SbomLicense {
  license?: {
    id?: string;
    name?: string;
    url?: string;
  };
  expression?: string;
}

export interface SbomDependency {
  ref: string;
  dependsOn?: string[];
}

/**
 * Parsed and indexed SBOM with efficient lookup structures
 */
export interface ParsedSbom {
  document: SbomDocument;
  componentsByRef: Map<string, SbomComponent>;
  componentsByName: Map<string, SbomComponent[]>;
  forwardDeps: Map<string, string[]>;
  reverseDeps: Map<string, string[]>;
  rootComponents: SbomComponent[];
}

/**
 * Result of searching for components
 */
export interface ComponentSearchResult {
  name: string;
  version?: string;
  type: string;
  purl?: string;
  bomRef: string;
  score?: number; // relevance score for fuzzy matches
}

/**
 * A path from a component up to a root marketplace module
 */
export interface DependencyPath {
  components: SbomComponent[];
  isComplete: boolean; // true if path reaches a root, false if orphaned
}

/**
 * Result of tracing a dependency to its roots
 */
export interface TraceResult {
  target: SbomComponent;
  paths: DependencyPath[];
  summary?: string;
}
