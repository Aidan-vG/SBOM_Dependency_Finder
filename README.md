# SBOM Dependency Finder for Mendix

## Overview

A tool designed to streamline the troubleshooting process for Mendix customer support engineers when investigating vulnerable JAR dependencies flagged in security scans.

## Problem Statement

When customers report vulnerable JAR dependencies discovered in security scans of their Mendix Studio Pro projects, it's often unclear which Mendix Marketplace widget or module contains the flagged dependency. This challenge is particularly acute for transitive (indirect) dependencies, where the vulnerable JAR is not directly included but is brought in as a dependency of another dependency.

The current manual investigation process is time-consuming and delays issue resolution, impacting both customer satisfaction and support efficiency.

## Solution

This tool enables support engineers to quickly identify the source of any dependency within a Mendix project by:

1. **Accepting user input**: The name of a specific JAR dependency and an SBOM (Software Bill of Materials) file from a Mendix Studio Pro project
2. **Fast graph analysis**: Using optimized dependency graph traversal to scan and analyze the SBOM structure
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

### Option 1: Standalone Executable (Recommended)

Download the pre-built executable for your platform:

**Windows:**
1. Download `sbom-finder.exe` from the releases page
2. Double-click `sbom-finder.exe` to launch
3. The interactive CLI will open automatically

**macOS:**
1. Download `sbom-finder-macos-x64` (Intel) or `sbom-finder-macos-arm64` (Apple Silicon)
2. Make it executable: `chmod +x sbom-finder-macos-*`
3. Run: `./sbom-finder-macos-x64` or `./sbom-finder-macos-arm64`

**No Node.js installation required!** The executables are completely standalone.

### Option 2: From Source

If you want to run from source or contribute to development:

```bash
npm install
```

## Usage

### Interactive Mode (Recommended)

**With standalone executable:**
- Windows: Double-click `sbom-finder.exe`
- macOS/Linux: Run `./sbom-finder-macos-x64` (or appropriate executable)

**From source:**
```bash
npx tsx src/index.ts
```

**Interactive menu:**
1. **Trace a single dependency** - Enter one dependency name and see its full chain
2. **Trace multiple dependencies** - Enter dependency names one by one (type "done" when finished)
3. **Search for components** - Find components by name
4. **Show SBOM info** - Display SBOM statistics

**Benefits:**
- No need to remember command syntax
- Step-by-step prompts with validation
- File path validation (checks if SBOM exists)
- Type "done" when finished entering dependencies
- Option to perform multiple operations in one session

**Example session:**
```
🔍 SBOM Dependency Finder - Interactive Mode

? Enter the path to your SBOM file: project-sbom.json
✔ Loaded SBOM with 65 components and 2 marketplace module(s)

What would you like to do?

1. Trace a single dependency
2. Trace multiple dependencies (batch mode)
3. Search for components
4. Show SBOM info

? Enter your choice (1-4): 2

📋 Batch Trace Mode

Enter dependency names one by one. Type "done" when finished.

? Dependency #1 (or "done" to finish): jakarta.mail-api
? Dependency #2 (or "done" to finish): netty-codec-http2
? Dependency #3 (or "done" to finish): done

🔄 Tracing 2 dependencies...

✔ Traced 2 dependencies

=== Batch Dependency Trace Results ===
...
```

### Command-Line Mode

For automation and scripting, use the traditional command-line interface:

#### Trace a Dependency

Trace a vulnerable JAR dependency to its parent marketplace module:

```bash
npx tsx src/index.ts trace <sbom-file> <dependency-name> [options]

# Example
npx tsx src/index.ts trace project-sbom.json "commons-text"
```

**Options:**
- `--json` - Output results as JSON
- `--verbose` - Show detailed output

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

### Build from Source

```bash
npm run build
```

### Build Standalone Executables

**Windows executable:**
```bash
npm run build:exe
```

**macOS executables (must be run on macOS):**
```bash
chmod +x scripts/build-exe-mac.sh
./scripts/build-exe-mac.sh
```

Executables are created in the `bin/` directory.

## Project Status

**Phase 1: Complete ✓**
- SBOM parsing and validation (CycloneDX 1.4)
- Dependency graph construction and traversal
- CLI commands: `trace`, `trace-batch`, `search`, `info`
- Interactive mode for easy use
- Multiple output formats: table, CSV, JSON
- Performance optimized (~5x faster with caching)
- Loading indicators and progress tracking
- Comprehensive unit tests (24 tests passing)
- Real Mendix SBOM compatibility

**Phase 2: Skipped**
- AI agent integration deemed unnecessary
- Core functionality fully meets requirements without AI

**Phase 3: Complete ✓**
- Standalone executable packaging using Node.js SEA (Single Executable Applications)
- Windows: `sbom-finder.exe` (92MB)
- macOS: Intel and Apple Silicon executables
- No Node.js installation required for end users
- Double-click to launch interactive mode

## Technical Details

- **Runtime**: Node.js + TypeScript
- **SBOM Format**: CycloneDX 1.4 JSON
- **Algorithm**: Graph traversal with caching and fuzzy search (Levenshtein distance)
- **Testing**: Vitest
- **Performance**: ~3-5 seconds per dependency trace
