import { describe, it, expect } from 'vitest';
import { parseSbomFile, SbomParseError, isMendixMarketplaceComponent, isJarLibrary } from '../../src/sbom/parser.js';
import type { SbomComponent } from '../../src/sbom/types.js';

describe('parseSbomFile', () => {
  it('should parse a valid SBOM file', () => {
    const sbom = parseSbomFile('test/fixtures/sample-sbom.json');
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.4');
    expect(sbom.components).toHaveLength(9);
    expect(sbom.dependencies).toHaveLength(9);
  });

  it('should throw error for non-existent file', () => {
    expect(() => parseSbomFile('non-existent.json')).toThrow(SbomParseError);
    expect(() => parseSbomFile('non-existent.json')).toThrow('SBOM file not found');
  });
});

describe('isMendixMarketplaceComponent', () => {
  it('should identify Mendix marketplace components by purl', () => {
    const component: SbomComponent = {
      type: 'framework',
      name: 'CommunityCommons',
      version: '4.1.0',
      'bom-ref': 'pkg:mendix/CommunityCommons@4.1.0?type=framework',
      purl: 'pkg:mendix/CommunityCommons@4.1.0?type=framework',
    };
    expect(isMendixMarketplaceComponent(component)).toBe(true);
  });

  it('should identify framework type components without Maven purl', () => {
    const component: SbomComponent = {
      type: 'framework',
      name: 'SomeModule',
      'bom-ref': 'some-ref',
    };
    expect(isMendixMarketplaceComponent(component)).toBe(true);
  });

  it('should not identify JAR libraries as marketplace components', () => {
    const component: SbomComponent = {
      type: 'library',
      name: 'commons-lang3',
      version: '3.12.0',
      'bom-ref': 'pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar',
      purl: 'pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar',
    };
    expect(isMendixMarketplaceComponent(component)).toBe(false);
  });
});

describe('isJarLibrary', () => {
  it('should identify JAR libraries by purl with type=jar', () => {
    const component: SbomComponent = {
      type: 'library',
      name: 'commons-lang3',
      version: '3.12.0',
      'bom-ref': 'pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar',
      purl: 'pkg:maven/org.apache.commons/commons-lang3@3.12.0?type=jar',
    };
    expect(isJarLibrary(component)).toBe(true);
  });

  it('should identify JAR libraries by Maven purl', () => {
    const component: SbomComponent = {
      type: 'library',
      name: 'guava',
      version: '32.0.1-jre',
      'bom-ref': 'pkg:maven/com.google.guava/guava@32.0.1-jre',
      purl: 'pkg:maven/com.google.guava/guava@32.0.1-jre',
    };
    expect(isJarLibrary(component)).toBe(true);
  });

  it('should identify JAR libraries by .jar extension', () => {
    const component: SbomComponent = {
      type: 'library',
      name: 'some-lib.jar',
      'bom-ref': 'some-ref',
    };
    expect(isJarLibrary(component)).toBe(true);
  });
});
