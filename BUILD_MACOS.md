# Building SBOM Dependency Finder for macOS

Complete guide for building and troubleshooting the macOS executable.

**Requirements:** Apple Silicon Mac (M1/M2/M3) only. Intel Macs are not supported.

**Note:** The build script automatically handles Node.js compatibility. If you have Homebrew Node.js (dynamically linked), it will download the official statically-linked Node.js binary needed for SEA builds.

---

## Build Instructions

### Prerequisites

1. **macOS** with Apple Silicon (M1/M2/M3)
2. **Node.js** v20 or later
3. **npm** v10 or later

Check your versions:
```bash
node --version    # Should be v20.x.x or later
npm --version     # Should be v10.x.x or later
uname -m          # Should show "arm64"
```

### Build Steps

**Step 1: Install dependencies**
```bash
npm install
```

**Step 2: Build the executable**
```bash
npm run build:exe
```

This will:
1. Detect if your Node.js is statically or dynamically linked
2. Download official Node.js binary if needed (cached in `.node-cache/`)
3. Compile TypeScript to JavaScript
4. Bundle the application with esbuild
5. Create SEA (Single Executable Application) blob
6. Generate `bin/sbom-finder-macos`
7. Code-sign the executable with ad-hoc signature
8. Set executable permissions automatically

**First build may take longer** as it downloads the official Node.js binary (~50MB). Subsequent builds use the cached binary.

**Step 3: Verify the build**
```bash
# Check file was created
ls -lh bin/
# Should show: sbom-finder-macos (~40-50MB)

# Check it's executable
ls -l bin/sbom-finder-macos
# Should show: -rwxr-xr-x (x = executable)
```

### Testing the Executable

**Test 1: Version check**
```bash
./bin/sbom-finder-macos --version
# Should show: 0.1.0
```

**Test 2: Help menu**
```bash
./bin/sbom-finder-macos --help
# Should show CLI usage information
```

**Test 3: SBOM info**
```bash
./bin/sbom-finder-macos info test/fixtures/sample-sbom.json
# Should show SBOM statistics
```

**Test 4: Trace a dependency**
```bash
./bin/sbom-finder-macos trace test/fixtures/sample-sbom.json commons-lang3
# Should show dependency trace tree
```

**Test 5: Interactive mode**
```bash
./bin/sbom-finder-macos
# Should show interactive menu
```

If all tests pass, the build is successful! ✅

---

## Packaging for Distribution

Create a zip file that preserves executable permissions:

```bash
npm run package
```

This creates `sbom-finder-macos-v0.1.0.zip` with the executable.

### Transfer to Windows

Copy these files to your Windows machine:
- `bin/sbom-finder-macos` (the executable)
- `sbom-finder-macos-v0.1.0.zip` (for distribution)

You can use:
- Cloud storage (OneDrive, Dropbox, etc.)
- USB drive
- Network share
- GitHub (commit to a release branch)

---

## Troubleshooting

### Issue 1: Executable shows Node.js version instead of 0.1.0

**Symptom:**
```bash
./bin/sbom-finder-macos --version
# Shows: v24.14.1 (wrong!)
```

**Diagnosis:**
```bash
# First, test if the bundle works
node dist/bundle.cjs --version
```

**If bundle shows v24.14.1:** Bundle is broken
```bash
# Clean and rebuild
rm -rf dist/ sea-prep.blob sea-config.json
npm run build:bundle

# Test again
node dist/bundle.cjs --version
# Should now show: 0.1.0

# Rebuild executable
npm run build:exe
```

**If bundle shows 0.1.0 but executable doesn't:** SEA injection failed

**Try this manual fix:**
```bash
# Remove the broken executable
rm bin/sbom-finder-macos

# Copy Node binary fresh
cp $(which node) bin/sbom-finder-macos

# Remove any existing signature
codesign --remove-signature bin/sbom-finder-macos 2>/dev/null || true

# Inject the blob manually
npx postject bin/sbom-finder-macos NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

# Sign it
codesign --sign - --force bin/sbom-finder-macos

# Make executable
chmod +x bin/sbom-finder-macos

# Check size (should be ~40-50MB, not 230MB)
ls -lh bin/sbom-finder-macos

# Test it
./bin/sbom-finder-macos --version
# Should show: 0.1.0
```

If this works, the automated build script has an issue. If this still shows Node version, there's a deeper problem with SEA on your system.

---

### Issue 2: Node.js REPL opens instead of the application

**Symptom:**
```
Welcome to Node.js v24.14.1.
Type ".help" for more information.
>
```

**Cause:** The SEA blob wasn't properly embedded.

**Solution:**
```bash
# Clean everything
rm -rf bin/ dist/ sea-prep.blob sea-config.json node_modules/.cache/

# Rebuild from scratch
npm run build:exe

# Verify blob was created
ls -lh sea-prep.blob
# Should show ~400KB

# Verify executable size
ls -lh bin/sbom-finder-macos
# Should show ~40-50MB (NOT 230MB!)

# Test
./bin/sbom-finder-macos --version
```

---

### Issue 3: "Multiple occurrences of sentinel found"

**Symptom:**
```
Error: Multiple occurences of sentinel "NODE_SEA_FUSE_..." found in the binary
```

**Cause:** Trying to inject into an executable that already has the blob.

**Solution:**
```bash
# Remove old executables
rm -rf bin/

# Rebuild
npm run build:exe
```

The build script now automatically removes old executables, but if you still see this, delete the bin/ folder manually.

---

## Complete Diagnostic Check

Run this to check everything at once:

```bash
echo "=== System Info ==="
uname -m
node --version
npm --version

echo ""
echo "=== Build Artifacts ==="
ls -lh bin/sbom-finder-macos 2>&1 || echo "❌ Executable missing"
ls -lh dist/bundle.cjs 2>&1 || echo "❌ Bundle missing"
ls -lh sea-prep.blob 2>&1 || echo "❌ Blob missing"

echo ""
echo "=== Bundle Test ==="
node dist/bundle.cjs --version 2>&1

echo ""
echo "=== Executable Test ==="
./bin/sbom-finder-macos --version 2>&1

echo ""
echo "=== SEA Check ==="
strings bin/sbom-finder-macos 2>/dev/null | grep -c NODE_SEA
```

**Expected output:**
```
=== System Info ===
arm64
v20.x.x (or v22.x.x or v24.x.x)
10.x.x

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

If any section doesn't match, that's where the problem is.

---

## Clean Rebuild (Nuclear Option)

If nothing else works, start completely fresh:

```bash
# 1. Remove everything
rm -rf bin/ dist/ sea-prep.blob sea-config.json node_modules/ node_modules/.cache/

# 2. Reinstall dependencies
npm install

# 3. Build
npm run build:exe

# 4. Test
./bin/sbom-finder-macos --version
```
