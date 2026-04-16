import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { arch } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const binDir = join(rootDir, 'bin');
const cacheDir = join(rootDir, '.node-cache');

// Node.js version to use for SEA (must be statically linked official build)
const SEA_NODE_VERSION = 'v20.19.0';

/**
 * Get a statically-linked Node.js binary suitable for SEA.
 * Homebrew Node.js is dynamically linked and won't work with postject.
 * This downloads the official Node.js binary if needed.
 */
async function getStaticNodeBinary(platform, archName) {
  // Check if local node binary is statically linked (>10MB = likely static)
  const localNodeSize = statSync(process.execPath).size;
  if (localNodeSize > 10 * 1024 * 1024) {
    console.log('  ℹ️  Local Node.js binary is statically linked, using it directly');
    return process.execPath;
  }

  console.log(`  ⚠️  Local Node.js is dynamically linked (${(localNodeSize / 1024).toFixed(0)}KB) — not suitable for SEA`);
  console.log(`  📥 Downloading official Node.js ${SEA_NODE_VERSION} binary...`);

  mkdirSync(cacheDir, { recursive: true });

  const ext = platform === 'win32' ? 'zip' : 'tar.gz';
  const osName = platform === 'darwin' ? 'darwin' : platform === 'win32' ? 'win' : 'linux';
  const archiveName = `node-${SEA_NODE_VERSION}-${osName}-${archName}`;
  const url = `https://nodejs.org/dist/${SEA_NODE_VERSION}/${archiveName}.tar.gz`;
  const cachedBinary = join(cacheDir, `node-${SEA_NODE_VERSION}-${osName}-${archName}-bin`);

  if (existsSync(cachedBinary)) {
    const cachedSize = statSync(cachedBinary).size;
    if (cachedSize > 10 * 1024 * 1024) {
      console.log('  ✓ Using cached official Node.js binary');
      return cachedBinary;
    }
    rmSync(cachedBinary);
  }

  const archivePath = join(cacheDir, `${archiveName}.tar.gz`);
  execSync(`curl -L -o "${archivePath}" "${url}"`, { cwd: rootDir, stdio: 'pipe' });
  console.log('  ✓ Downloaded archive');

  execSync(`tar -xzf "${archivePath}" -C "${cacheDir}" "${archiveName}/bin/node"`, { cwd: rootDir, stdio: 'pipe' });
  const extractedBin = join(cacheDir, archiveName, 'bin', 'node');
  copyFileSync(extractedBin, cachedBinary);

  // Clean up extracted directory and archive
  rmSync(join(cacheDir, archiveName), { recursive: true, force: true });
  rmSync(archivePath, { force: true });

  console.log(`  ✓ Extracted official Node.js binary (${(statSync(cachedBinary).size / (1024 * 1024)).toFixed(1)}MB)`);
  return cachedBinary;
}

async function main() {
  // Ensure directories exist
  mkdirSync(binDir, { recursive: true });

  console.log('🔨 Building standalone executables...\n');

  // Detect platform
  const platform = process.platform;

  // Resolve the Node.js binary to use for SEA (must be statically linked)
  let seaNodeBinary = process.execPath;
  if (platform === 'darwin' || platform === 'linux') {
    const archName = arch() === 'x64' ? 'x64' : 'arm64';
    seaNodeBinary = await getStaticNodeBinary(platform, archName);
  }

  // Step 1: Create the SEA configuration
  console.log('\n📋 Creating SEA configuration...');
  const seaConfig = {
    main: 'dist/bundle.cjs',
    output: 'sea-prep.blob',
    disableExperimentalSEAWarning: true,
    useSnapshot: false,
    useCodeCache: true,
    assets: {}
  };

  writeFileSync(
    join(rootDir, 'sea-config.json'),
    JSON.stringify(seaConfig, null, 2)
  );

  // Step 2: Generate the blob using the same Node binary that will be the target
  console.log('📦 Generating SEA blob...');
  try {
    execSync(`"${seaNodeBinary}" --experimental-sea-config sea-config.json`, {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('❌ Failed to generate SEA blob');
    process.exit(1);
  }

  // Step 3: Create platform-specific executable
  if (platform === 'win32') {
    console.log('\n🪟 Creating Windows executable...');
    try {
      const nodePath = process.execPath;
      const winExe = join(binDir, 'sbom-finder.exe');

      if (existsSync(winExe)) {
        rmSync(winExe);
        console.log('  ✓ Removed existing executable');
      }

      copyFileSync(nodePath, winExe);
      console.log('  ✓ Copied node.exe');

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
    console.log('\n🍎 Creating macOS executable (Apple Silicon)...');

    const binaryName = 'sbom-finder-macos';

    try {
      const macExe = join(binDir, binaryName);

      if (existsSync(macExe)) {
        rmSync(macExe);
        console.log('  ✓ Removed existing executable');
      }

      copyFileSync(seaNodeBinary, macExe);
      console.log('  ✓ Copied node binary');

      // Remove existing code signature (required before injection on macOS)
      try {
        execSync(`codesign --remove-signature "${macExe}"`, {
          cwd: rootDir,
          stdio: 'pipe',
        });
        console.log('  ✓ Removed existing signature');
      } catch (signError) {
        console.log('  ℹ️  No existing signature to remove');
      }

      // Inject the blob
      execSync(`npx postject "${macExe}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
      console.log('  ✓ Injected application blob');

      // Ad-hoc code sign
      try {
        execSync(`codesign --sign - --force "${macExe}"`, {
          cwd: rootDir,
          stdio: 'pipe',
        });
        console.log('  ✓ Code-signed executable');
      } catch (signError) {
        console.warn('  ⚠️  Warning: Could not code-sign (may require chmod +x)');
      }

      execSync(`chmod +x "${macExe}"`, { cwd: rootDir });
      console.log('  ✓ Set executable permission');

      const stats = statSync(macExe);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`  ℹ️  File size: ${sizeMB}MB`);

      if (stats.size > 100 * 1024 * 1024) {
        console.warn('  ⚠️  Warning: File size is unusually large (>100MB). Expected ~40-50MB.');
      }

      console.log(`  ✓ Created: ${macExe}`);
    } catch (error) {
      console.error('  ❌ Failed to create macOS executable:', error.message);
    }
  } else if (platform === 'linux') {
    console.log('\n🐧 Creating Linux executable...');
    try {
      const linuxExe = join(binDir, 'sbom-finder-linux');

      if (existsSync(linuxExe)) {
        rmSync(linuxExe);
        console.log('  ✓ Removed existing executable');
      }

      copyFileSync(seaNodeBinary, linuxExe);
      console.log('  ✓ Copied node binary');

      execSync(`npx postject "${linuxExe}" NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`, {
        cwd: rootDir,
        stdio: 'inherit',
      });
      console.log('  ✓ Injected application blob');

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
}

main().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
