import * as fs from 'fs';
import type { SbomDocument, SbomComponent } from './types.js';

export class SbomParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SbomParseError';
  }
}

/**
 * Parse and validate a CycloneDX SBOM JSON file
 */
export function parseSbomFile(filePath: string): SbomDocument {
  // Check file exists
  if (!fs.existsSync(filePath)) {
    throw new SbomParseError(`SBOM file not found: ${filePath}`);
  }

  // Check file size (warn if > 50MB)
  const stats = fs.statSync(filePath);
  if (stats.size > 50 * 1024 * 1024) {
    console.warn(`Warning: SBOM file is very large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Parsing may be slow.`);
  }

  // Read and parse JSON
  let data: unknown;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new SbomParseError(`Invalid JSON in SBOM file: ${error.message}`);
    }
    throw new SbomParseError(`Failed to read SBOM file: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Validate SBOM structure
  return validateSbom(data);
}

/**
 * Validate that the parsed JSON is a valid CycloneDX SBOM
 */
function validateSbom(data: unknown): SbomDocument {
  if (typeof data !== 'object' || data === null) {
    throw new SbomParseError('SBOM must be a JSON object');
  }

  const sbom = data as Record<string, unknown>;

  // Check bomFormat
  if (sbom.bomFormat !== 'CycloneDX') {
    throw new SbomParseError(`Invalid bomFormat: expected "CycloneDX", got "${sbom.bomFormat}". This may not be a CycloneDX SBOM.`);
  }

  // Check specVersion
  if (typeof sbom.specVersion !== 'string') {
    throw new SbomParseError('Missing or invalid specVersion field');
  }

  const specVersion = sbom.specVersion;
  if (!specVersion.startsWith('1.')) {
    console.warn(`Warning: Untested CycloneDX version ${specVersion}. This tool was designed for version 1.4.`);
  }

  // Check components array
  if (!Array.isArray(sbom.components)) {
    throw new SbomParseError('Missing or invalid "components" array');
  }

  // Validate components
  for (let i = 0; i < sbom.components.length; i++) {
    const component = sbom.components[i];
    if (typeof component !== 'object' || component === null) {
      throw new SbomParseError(`Component at index ${i} is not a valid object`);
    }

    const comp = component as Record<string, unknown>;

    if (typeof comp.type !== 'string') {
      throw new SbomParseError(`Component at index ${i} is missing required "type" field`);
    }

    if (typeof comp.name !== 'string') {
      throw new SbomParseError(`Component at index ${i} is missing required "name" field`);
    }

    if (typeof comp['bom-ref'] !== 'string') {
      throw new SbomParseError(`Component at index ${i} is missing required "bom-ref" field`);
    }
  }

  // Check dependencies array (optional but expected for Mendix SBOMs)
  if (!Array.isArray(sbom.dependencies)) {
    console.warn('Warning: No "dependencies" array found in SBOM. Dependency tracing will be limited.');
    sbom.dependencies = [];
  }

  // Validate dependencies
  for (let i = 0; i < sbom.dependencies.length; i++) {
    const dep = sbom.dependencies[i];
    if (typeof dep !== 'object' || dep === null) {
      throw new SbomParseError(`Dependency at index ${i} is not a valid object`);
    }

    const dependency = dep as Record<string, unknown>;

    if (typeof dependency.ref !== 'string') {
      throw new SbomParseError(`Dependency at index ${i} is missing required "ref" field`);
    }

    if (dependency.dependsOn !== undefined && !Array.isArray(dependency.dependsOn)) {
      throw new SbomParseError(`Dependency at index ${i} has invalid "dependsOn" field (must be an array)`);
    }
  }

  return sbom as SbomDocument;
}

/**
 * Check if a component is a Mendix marketplace module/widget
 */
export function isMendixMarketplaceComponent(component: SbomComponent): boolean {
  return (
    component.purl?.startsWith('pkg:mendix/') === true ||
    (component.type === 'framework' && !component.purl?.startsWith('pkg:maven/'))
  );
}

/**
 * Check if a component is a JAR library
 */
export function isJarLibrary(component: SbomComponent): boolean {
  return (
    component.purl?.includes('?type=jar') === true ||
    component.purl?.startsWith('pkg:maven/') === true ||
    (component.type === 'library' && component.name.endsWith('.jar'))
  );
}

/**
 * Get a human-readable display name for a component
 */
export function getComponentDisplayName(component: SbomComponent): string {
  if (component.version) {
    return `${component.name} v${component.version}`;
  }
  return component.name;
}
