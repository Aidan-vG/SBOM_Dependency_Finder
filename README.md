# SBOM Dependency Finder for Mendix

## Overview

A web-based tool designed to help Mendix support engineers quickly identify the source of JAR dependencies in Mendix Studio Pro projects.

## Problem Statement

When customers report vulnerable JAR dependencies discovered in security scans of their Mendix Studio Pro projects, it's often unclear which Mendix Marketplace widget or module contains the flagged dependency. This challenge is particularly acute for transitive (indirect) dependencies, where the vulnerable JAR is not directly included but is brought in as a dependency of another dependency.

## Solution

This web app enables support engineers to quickly identify the source of any dependency within a Mendix project by:

1. **Uploading an SBOM**: Drop in a CycloneDX SBOM file from a Mendix Studio Pro project
2. **Live search**: Type a dependency name and see matching results instantly
3. **Dependency visualization**: View complete dependency paths showing all levels from the flagged dependency up to the parent Mendix Marketplace widget/module
4. **Batch tracing**: Trace multiple dependencies at once and export results as CSV or JSON

## Features

### Single Dependency Trace
- **Live search** - Results appear as you type (minimum 2 characters)
- **Clickable results** - Click any search result to instantly trace that dependency
- **One-line summary** - Quick overview with clickable marketplace links
- **Detailed paths** - Expandable section showing full dependency chains

### Batch Trace
- **Multiple dependencies** - Paste a list of dependencies (one per line)
- **Summary view** - See all results at a glance with clickable marketplace links
- **Export options** - Download results as CSV or JSON
- **Detailed results** - Expand any dependency to see its full path

### SBOM Information
- View component counts and statistics
- See marketplace modules included in the SBOM

## Usage

1. **Load an SBOM**: Drag and drop your CycloneDX SBOM JSON file
2. **Search for dependencies**: 
   - Use the **Single Dependency** tab to search and trace one dependency
   - Use the **Batch Trace** tab to analyze multiple dependencies at once
3. **View results**: Click on dependency names or expand detailed results to see full paths
4. **Export data**: Use the CSV or JSON export buttons in batch mode

## Technical Details

- **Frontend**: React + TypeScript + Vite
- **SBOM Format**: CycloneDX 1.4 JSON
- **Algorithm**: Graph traversal with fuzzy search (Levenshtein distance)
- **Performance**: Instant search results, optimized for large SBOMs (tested with 65+ components)

## Development

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
npm install
```

### Run Development Server
```bash
npm run dev:web
```

### Build for Production
```bash
npm run build:web
```

### Run Tests
```bash
npm test
```

## Project Status

**Current Version: Web App Only**

- ✅ SBOM parsing and validation (CycloneDX 1.4)
- ✅ Live search with instant results
- ✅ Single dependency tracing
- ✅ Batch dependency tracing
- ✅ Multiple export formats (CSV, JSON)
- ✅ Clickable marketplace links
- ✅ Collapsible detailed results
- ✅ Comprehensive unit tests
- ✅ Real Mendix SBOM compatibility

## License

Built for Mendix Support Engineers
