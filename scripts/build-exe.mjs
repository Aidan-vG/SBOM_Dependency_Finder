import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const binDir = join(rootDir, 'bin');

// Ensure directories exist
mkdirSync(binDir, { recursive: true });

console.log('🔨 Building standalone executables...\n');

// Step 1: Create the SEA configuration
console.log('📋 Creating SEA configuration...');
const seaConfig = {
  main: 'dist/bundle.cjs',
  output: 'sea-prep.blob',
  disableExperimentalSEAWarning: true,
};

writeFileSync(
  join(rootDir, 'sea-config.json'),
  JSON.stringify(seaConfig, null, 2)
);

// Step 2: Generate the blob
console.log('📦 Generating SEA blob...');
try {
  execSync('node --experimental-sea-config sea-config.json', {
    cwd: rootDir,
    stdio: 'inherit',
  });
} catch (error) {
  console.error('❌ Failed to generate SEA blob');
  process.exit(1);
}

// Step 3: Create Windows executable
console.log('\n🪟 Creating Windows executable...');
try {
  // Copy node.exe
  const nodePath = process.execPath;
  const winExe = join(binDir, 'sbom-finder.exe');

  copyFileSync(nodePath, winExe);
  console.log('  ✓ Copied node.exe');

  // Inject the blob using postject
  execSync(`npx postject "${winExe}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
  console.log('  ✓ Injected application blob');
  console.log(`  ✓ Created: ${winExe}`);
} catch (error) {
  console.error('❌ Failed to create Windows executable:', error.message);
}

// Note about macOS builds
console.log('\n📝 Note: macOS executables must be built on a Mac due to code signing requirements.');
console.log('   Run this script on macOS to create mac executables.\n');

console.log('✅ Build complete!\n');
console.log('Executables created in bin/');
