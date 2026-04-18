# Web App Deployment Guide

## Overview

The SBOM Dependency Finder now includes a web app version that runs entirely in the browser. This guide explains how to deploy it to GitHub Pages.

## Prerequisites

- GitHub repository with GitHub Pages enabled
- Push access to the repository

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys the web app when you push changes.

1. **Enable GitHub Pages:**
   - Go to your repository settings
   - Navigate to "Pages" in the sidebar
   - Under "Source", select "GitHub Actions"

2. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Add web app"
   git push origin main
   ```

3. **Wait for deployment:**
   - Go to the "Actions" tab in your repository
   - Watch the "Deploy Web App" workflow run
   - Once complete, your app will be live at:
     `https://[username].github.io/SBOM_Dependency_Finder/`

The workflow automatically:
- Runs on every push to main that affects web app files
- Installs dependencies
- Builds the production bundle
- Deploys to GitHub Pages

### Option 2: Manual Deployment

If you prefer manual deployment:

1. **Build the web app locally:**
   ```bash
   npm run build:web
   ```

2. **Deploy the `dist-web` folder:**
   - Use any static hosting service (Vercel, Netlify, Cloudflare Pages, etc.)
   - Point the deployment to the `dist-web` directory

## Local Development

### Start dev server:
```bash
npm run dev:web
```

The app will be available at `http://localhost:5173`

### Preview production build:
```bash
npm run build:web
npm run preview:web
```

## GitHub Pages Configuration

If your repository is hosted under a subpath (e.g., `username.github.io/SBOM_Dependency_Finder/`), you may need to update the `base` option in `vite.config.ts`:

```typescript
export default defineConfig({
  // ... other config
  base: '/SBOM_Dependency_Finder/',
});
```

This is already configured correctly for the default GitHub Pages setup.

## Troubleshooting

### Workflow fails with "Pages permission denied"

Make sure:
1. GitHub Pages is enabled in repository settings
2. The workflow has write permissions (Settings → Actions → General → Workflow permissions)

### App loads but files are 404

Check the `base` path in `vite.config.ts` matches your deployment URL structure.

### Build warnings about `fs` module

This is expected. The `fs` module is used only in CLI mode and Vite correctly excludes it from the browser bundle.

## Alternative Hosting Options

### Vercel
1. Import your GitHub repo
2. Vite is auto-detected
3. Build command: `npm run build:web`
4. Output directory: `dist-web`

### Netlify
1. Connect your GitHub repo
2. Build command: `npm run build:web`
3. Publish directory: `dist-web`

### Cloudflare Pages
1. Connect your GitHub repo
2. Build command: `npm run build:web`
3. Build output directory: `dist-web`

All of these platforms offer free tiers with unlimited bandwidth or generous limits.
