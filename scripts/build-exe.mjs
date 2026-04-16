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

// Detect platform
const platform = process.platform;

// Step 3: Create platform-specific executable
if (platform === 'win32') {
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
} else if (platform === 'darwin') {
  console.log('\n🍎 Creating macOS executables...');

  // Create for both architectures
  const architectures = [
    { name: 'arm64', binary: 'sbom-finder-macos-arm64' },
    { name: 'x64', binary: 'sbom-finder-macos-x64' }
  ];

  for (const arch of architectures) {
    try {
      console.log(`\n  Building for ${arch.name}...`);
      const macExe = join(binDir, arch.binary);

      // Copy node binary
      copyFileSync(process.execPath, macExe);
      console.log(`    ✓ Copied node binary`);

      // Inject the blob
      execSync(`npx postject "${macExe}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
      console.log(`    ✓ Injected application blob`);

      // Ad-hoc code sign (required for macOS to run without chmod)
      try {
        execSync(`codesign --sign - --force "${macExe}"`, {
          cwd: rootDir,
          stdio: 'pipe',
        });
        console.log(`    ✓ Code-signed executable`);
      } catch (signError) {
        console.warn(`    ⚠️  Warning: Could not code-sign (may require chmod +x)`);
      }

      console.log(`    ✓ Created: ${macExe}`);
    } catch (error) {
      console.error(`    ❌ Failed to create ${arch.name} executable:`, error.message);
    }
  }

  console.log('\n  💡 Tip: Distribute these executables in a .zip file to preserve executable permissions');
} else if (platform === 'linux') {
  console.log('\n🐧 Creating Linux executable...');
  try {
    const linuxExe = join(binDir, 'sbom-finder-linux');

    copyFileSync(process.execPath, linuxExe);
    console.log('  ✓ Copied node binary');

    execSync(`npx postject "${linuxExe}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('  ✓ Injected application blob');

    // Set executable permission
    execSync(`chmod +x "${linuxExe}"`, { cwd: rootDir });
    console.log('  ✓ Set executable permission');

    console.log(`  ✓ Created: ${linuxExe}`);
  } catch (error) {
    console.error('❌ Failed to create Linux executable:', error.message);
  }
} else {
  console.log(`\n⚠️  Platform ${platform} is not supported yet`);
}

console.log('\n✅ Build complete!\n');
console.log('Executables created in bin/');
