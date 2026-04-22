# SBOM Dependency Finder — Claude Code Instructions

## Project Overview

This is a **web-only** React application for tracing JAR dependencies in Mendix SBOMs to their parent marketplace modules.

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Testing**: Vitest
- **SBOM Format**: CycloneDX 1.4 JSON

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Coding Standards

- Follow existing React/TypeScript patterns in the codebase
- Run tests after making changes
- Do not add dependencies without asking
- Keep components focused and reusable
- Use existing CSS class names for consistent styling

## Safety Rules

- NEVER read or output secrets, API keys, or credentials
- NEVER run destructive git commands without confirmation
- NEVER push to `main` branch without user approval
