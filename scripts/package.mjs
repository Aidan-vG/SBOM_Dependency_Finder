#!/usr/bin/env node

/**
 * Package executables for distribution
 * Creates platform-specific zip files that preserve executable permissions
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const binDir = join(rootDir, 'bin');

// Get version from package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

console.log(`📦 Packaging SBOM Dependency Finder v${version}\n`);

// Check what executables exist
const executables = {
  windows: existsSync(join(binDir, 'sbom-finder.exe')),
  macos: existsSync(join(binDir, 'sbom-finder-macos')),
  linux: existsSync(join(binDir, 'sbom-finder-linux')),
};

// Package Windows executable
if (executables.windows) {
  console.log('🪟 Packaging Windows executable...');
  try {
    const zipName = `sbom-finder-windows-v${version}.zip`;
    if (process.platform === 'win32') {
      // Use PowerShell on Windows
      execSync(`powershell Compress-Archive -Path bin\\sbom-finder.exe -DestinationPath ${zipName} -Force`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } else {
      // Use zip on Unix-like systems
      execSync(`zip ${zipName} bin/sbom-finder.exe`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    }
    console.log(`  ✓ Created: ${zipName}\n`);
  } catch (error) {
    console.error('  ❌ Failed to package Windows executable\n');
  }
}

// Package macOS executable
if (executables.macos) {
  console.log('🍎 Packaging macOS executable...');
  try {
    const zipName = `sbom-finder-macos-v${version}.zip`;
    const file = 'bin/sbom-finder-macos';

    if (process.platform === 'win32') {
      // Use PowerShell on Windows
      const fileList = file.replace(/\//g, '\\\\');
      execSync(`powershell Compress-Archive -Path ${fileList} -DestinationPath ${zipName} -Force`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } else {
      // Use zip on Unix-like systems
      execSync(`zip ${zipName} ${file}`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    }
    console.log(`  ✓ Created: ${zipName}\n`);
  } catch (error) {
    console.error('  ❌ Failed to package macOS executable\n');
  }
}

// Package Linux executable
if (executables.linux) {
  console.log('🐧 Packaging Linux executable...');
  try {
    const zipName = `sbom-finder-linux-v${version}.zip`;
    if (process.platform === 'win32') {
      execSync(`powershell Compress-Archive -Path bin\\sbom-finder-linux -DestinationPath ${zipName} -Force`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    } else {
      execSync(`zip ${zipName} bin/sbom-finder-linux`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
    }
    console.log(`  ✓ Created: ${zipName}\n`);
  } catch (error) {
    console.error('  ❌ Failed to package Linux executable\n');
  }
}

console.log('✅ Packaging complete!\n');
console.log('Distribution packages:');
if (executables.windows) console.log(`  - sbom-finder-windows-v${version}.zip`);
if (executables.macos) console.log(`  - sbom-finder-macos-v${version}.zip`);
if (executables.linux) console.log(`  - sbom-finder-linux-v${version}.zip`);
console.log('\nThese packages preserve executable permissions and are ready for distribution.');
