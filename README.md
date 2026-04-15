# SBOM Dependency Finder for Mendix

## Overview

A tool designed to streamline the troubleshooting process for Mendix customer support engineers when investigating vulnerable JAR dependencies flagged in security scans.

## Problem Statement

When customers report vulnerable JAR dependencies discovered in security scans of their Mendix Studio Pro projects, it's often unclear which Mendix Marketplace widget or module contains the flagged dependency. This challenge is particularly acute for transitive (indirect) dependencies, where the vulnerable JAR is not directly included but is brought in as a dependency of another dependency.

The current manual investigation process is time-consuming and delays issue resolution, impacting both customer satisfaction and support efficiency.

## Solution

This tool enables support engineers to quickly identify the source of any dependency within a Mendix project by:

1. **Accepting user input**: The name of a specific JAR dependency and an SBOM (Software Bill of Materials) file from a Mendix Studio Pro project
2. **AI-powered analysis**: Using an AI agent to scan and analyze the SBOM structure
3. **Dependency tree visualization**: Providing a complete dependency tree showing all levels from the flagged dependency up to the parent Mendix Marketplace widget/module

## Benefits

- **Faster troubleshooting**: Dramatically reduces time spent identifying dependency sources
- **Complete visibility**: Shows the full dependency chain, including transitive dependencies
- **Improved support efficiency**: Enables support engineers to quickly advise customers on which widgets/modules need updates or replacement
- **Better security posture**: Helps customers address vulnerabilities more quickly by identifying exact sources

## Target Users

- Mendix Customer Support Engineers
- Mendix Developers investigating security vulnerabilities
- Security teams performing dependency audits on Mendix projects

## Installation

```bash
npm install
```

## Usage

### Trace a Dependency

Trace a vulnerable JAR dependency to its parent marketplace module:

```bash
npx tsx src/index.ts trace <sbom-file> <dependency-name> [options]

# Example
npx tsx src/index.ts trace project-sbom.json "commons-text" --no-ai
```

**Options:**
- `--no-ai` - Use direct graph traversal (default mode)
- `--json` - Output results as JSON
- `--verbose` - Show detailed reasoning

**Example Output:**
```
=== Dependency Trace Results ===

Target: commons-text v1.10.0 [JAR Library]

Found 1 path to marketplace module:

Path 1:
CommunityCommons v4.1.0 [Marketplace Module]
  └── commons-lang3 v3.12.0 [JAR]
    └── commons-text v1.10.0 [JAR] ← target

=== Summary ===
The dependency "commons-text" is a transitive dependency brought in 
through the marketplace module: CommunityCommons v4.1.0.
```

### Batch Trace Multiple Dependencies

Trace multiple dependencies at once from a security scan report:

```bash
npx tsx src/index.ts trace-batch <sbom-file> <dependency-file> [options]

# Example
npx tsx src/index.ts trace-batch project-sbom.json vulnerabilities.txt
```

**Input file format** (one dependency per line):
```
# vulnerabilities.txt
jakarta.mail-api
netty-codec-http2
log4j-core
jackson-databind
```

**Options:**
- `--format <format>` - Output format: `table` (default), `csv`, or `json`
- `--output <file>` - Write results to file instead of stdout

**Example Output (table format):**
```
=== Batch Dependency Trace Results ===

Summary:
  Total dependencies scanned: 4
  Found: 3
  Not found: 1
  With marketplace paths: 3
  Without marketplace paths: 0

Detailed Results:

✓ jakarta.mail-api
  → Email_Connector v98426 (7 paths)

✓ netty-codec-http2
  → AmazonS3Connector v5.1.0 (3 paths)

✓ log4j-core
  → CommunityCommons v4.1.0 (1 path)

✗ unknown-library
  → No matching component found
```

**CSV output:**
```bash
npx tsx src/index.ts trace-batch project-sbom.json vulnerabilities.txt --format csv --output results.csv
```

**JSON output:**
```bash
npx tsx src/index.ts trace-batch project-sbom.json vulnerabilities.txt --format json --output results.json
```

### Search Components

Search for components in an SBOM:

```bash
npx tsx src/index.ts search <sbom-file> <query>

# Example
npx tsx src/index.ts search project-sbom.json "jackson"
```

### Show SBOM Info

Display summary information about an SBOM:

```bash
npx tsx src/index.ts info <sbom-file>
```

## Development

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

## Project Status

**Phase 1: Complete ✓**
- SBOM parsing and validation (CycloneDX 1.4)
- Dependency graph construction and traversal
- CLI commands: `trace`, `trace-batch`, `search`, `info`
- Multiple output formats: table, CSV, JSON
- Performance optimized (~5x faster with caching)
- Loading indicators and progress tracking
- Comprehensive unit tests (24 tests passing)
- Real Mendix SBOM compatibility

**Phase 2: Skipped**
- AI agent integration deemed unnecessary
- Core functionality fully meets requirements without AI

**Phase 3: Next**
- Standalone executable packaging (Windows/Mac)
- CI/CD pipeline for automated builds
- Distribution as npm package

## Technical Details

- **Runtime**: Node.js + TypeScript
- **SBOM Format**: CycloneDX 1.4 JSON
- **AI**: AWS Bedrock Converse API (Phase 2)
- **Testing**: Vitest
