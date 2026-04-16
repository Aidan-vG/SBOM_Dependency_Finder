# macOS Build Diagnostics

Run these commands to diagnose SEA build issues.

**IMPORTANT:** You mentioned seeing `sbom-finder-macos-arm64` but the latest code creates `sbom-finder-macos`. This means you need to pull the latest changes!

## Step 1: Verify you have the latest code

```bash
git pull
git log --oneline -1
# Should show: ac881ec Simplify macOS build: Apple Silicon only
```

## Step 2: Check the build script

```bash
# The build script should create sbom-finder-macos (not sbom-finder-macos-arm64)
grep "binaryName" scripts/build-exe.mjs
# Should show: const binaryName = 'sbom-finder-macos';
```

## Step 3: Clean ALL artifacts

```bash
# Remove everything
rm -rf bin/ dist/ node_modules/.cache sea-prep.blob sea-config.json

# Check they're gone
ls bin/ 2>&1
# Should show: "No such file or directory"
```

## Step 4: Rebuild

```bash
npm run build:exe
```

## Step 5: Verify the build

```bash
# Check file exists and size
ls -lh bin/
# Should show sbom-finder-macos (NOT sbom-finder-macos-arm64)
# Size should be ~40-50MB (NOT 230MB!)

# Check the blob
ls -lh sea-prep.blob
# Should be ~300-500KB

# Check SEA configuration
cat sea-config.json
# Should show useCodeCache: true
```

## Step 6: Test the bundled code directly

Before testing the executable, verify the bundle works:

```bash
# Test the bundle directly with Node
node dist/bundle.cjs --version
# Should show: 0.1.0 (NOT v24.14.1)

# Test with help
node dist/bundle.cjs --help
# Should show the CLI help menu
```

**If this shows Node version, the bundle is broken!**

## Step 7: Test the executable

Only if Step 6 works:

```bash
# Test version
./bin/sbom-finder-macos --version
# Should show: 0.1.0

# Test help
./bin/sbom-finder-macos --help
# Should show CLI help menu

# Test with sample data
./bin/sbom-finder-macos info test/fixtures/sample-sbom.json
# Should show SBOM information
```

## Step 8: Verify SEA is working

```bash
# Check if the executable has the SEA blob embedded
# Look for the NODE_SEA marker
strings bin/sbom-finder-macos | grep NODE_SEA | head -5
# Should show NODE_SEA markers
```

## Common Issues

### Issue: node dist/bundle.cjs --version shows Node version

**Problem:** The bundle isn't including the CLI code properly.

**Solution:**

```bash
# Check what's in the bundle
head -50 dist/bundle.cjs
# Should start with actual code, not just "use strict"

# Check bundle size
ls -lh dist/bundle.cjs
# Should be ~200-300KB, not tiny

# Rebuild just the bundle
npm run build:bundle

# Check if bundle has Commander code
grep -i "commander" dist/bundle.cjs | head -3
# Should show Commander code is bundled
```

### Issue: Executable is 230MB (too large)

**Problem:** Something is wrong with the build. Should be ~40-50MB.

**Possible causes:**
1. Multiple blobs injected
2. Corrupted build
3. Wrong Node binary

**Solution:**

```bash
# Start completely fresh
rm -rf bin/ dist/ sea-prep.blob sea-config.json node_modules/.cache/

# Rebuild
npm run build:exe

# Check size
ls -lh bin/sbom-finder-macos
# Should be 40-50MB
```

### Issue: ./bin/sbom-finder-macos --version shows Node version

**Problem:** The SEA isn't executing the bundled code.

**Debug:**

```bash
# First check if the bundle works
node dist/bundle.cjs --version

# If bundle works but executable doesn't, check injection
npx postject --help
# Verify postject is available

# Check if blob was actually injected
ls -lh bin/sbom-finder-macos
# Compare to: ls -lh $(which node)
# SEA should be significantly larger than base Node

# Try manual injection
rm bin/sbom-finder-macos
cp $(which node) bin/sbom-finder-macos
npx postject bin/sbom-finder-macos NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA
codesign --sign - --force bin/sbom-finder-macos
chmod +x bin/sbom-finder-macos

# Test again
./bin/sbom-finder-macos --version
```

## Full Diagnostic Output

Run this and share the output:

```bash
echo "=== System Info ==="
sw_vers
echo ""
uname -m
echo ""
node --version
echo ""
npm --version

echo ""
echo "=== Git Status ==="
git log --oneline -1
git status --short

echo ""
echo "=== Build Artifacts ==="
ls -lh bin/ 2>&1 || echo "bin/ does not exist"
ls -lh dist/bundle.cjs 2>&1 || echo "bundle.cjs does not exist"
ls -lh sea-prep.blob 2>&1 || echo "sea-prep.blob does not exist"

echo ""
echo "=== Bundle Test ==="
node dist/bundle.cjs --version 2>&1 || echo "Bundle test failed"

echo ""
echo "=== Executable Test ==="
./bin/sbom-finder-macos --version 2>&1 || echo "Executable test failed"

echo ""
echo "=== SEA Check ==="
strings bin/sbom-finder-macos 2>/dev/null | grep -c NODE_SEA || echo "No NODE_SEA markers found"
```

## Expected Output

```
=== System Info ===
macOS 14.x (or later)
arm64
v20.x.x or v22.x.x or v24.x.x
10.x.x

=== Git Status ===
ac881ec Simplify macOS build: Apple Silicon only
(clean working directory)

=== Build Artifacts ===
-rwxr-xr-x  1 user  staff   45M Apr 16 12:00 bin/sbom-finder-macos
-rw-r--r--  1 user  staff  250K Apr 16 12:00 dist/bundle.cjs
-rw-r--r--  1 user  staff  400K Apr 16 12:00 sea-prep.blob

=== Bundle Test ===
0.1.0

=== Executable Test ===
0.1.0

=== SEA Check ===
5
```

If any of these don't match, there's a problem with that step.
