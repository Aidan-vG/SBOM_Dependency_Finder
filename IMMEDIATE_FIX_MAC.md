# Immediate Fix for macOS Build Issue

## The Problem

You're seeing `sbom-finder-macos-arm64` but the latest code creates `sbom-finder-macos` (no suffix).

This means **you don't have the latest code!**

## The Solution

Run these commands **exactly** in this order:

```bash
# 1. Go to your project directory
cd ~/Desktop/aidansapp/SBOM_Dependency_Finder

# 2. Check what you have
git log --oneline -1

# If it's NOT "ac881ec Simplify macOS build: Apple Silicon only", continue:

# 3. Pull latest changes
git pull origin main

# 4. Verify you got the update
git log --oneline -1
# Should now show: ac881ec Simplify macOS build: Apple Silicon only

# 5. Remove ALL old build files
rm -rf bin/ dist/ sea-prep.blob sea-config.json node_modules/.cache/

# 6. Rebuild from scratch
npm run build:exe

# 7. Verify the correct file was created
ls -lh bin/
# Should show: sbom-finder-macos (NOT sbom-finder-macos-arm64)
# Size should be: ~40-50MB (NOT 230MB)

# 8. Test the bundle first
node dist/bundle.cjs --version
# Should show: 0.1.0 (if this shows v24.14.1, the bundle is broken)

# 9. Test the executable
./bin/sbom-finder-macos --version
# Should show: 0.1.0

# 10. Test with real data
./bin/sbom-finder-macos info test/fixtures/sample-sbom.json
```

## If Step 8 Shows Node Version (v24.14.1)

The bundle itself is broken. This means the TypeScript isn't being compiled/bundled correctly.

```bash
# Check the bundle
ls -lh dist/bundle.cjs
# Should be ~200-300KB

# Check if it has any actual code
head -100 dist/bundle.cjs
# Should show bundled JavaScript code with "commander", "chalk", etc.

# If the bundle is tiny or looks wrong, rebuild just the bundle:
rm -rf dist/
npm run build:bundle

# Check again
node dist/bundle.cjs --version
```

## If Step 9 Shows Node Version but Step 8 is OK

The bundle works, but SEA injection failed.

```bash
# Check if postject worked
strings bin/sbom-finder-macos | grep "NODE_SEA" | head -3
# Should show NODE_SEA markers

# If no markers, injection failed. Try manual injection:
rm bin/sbom-finder-macos
cp $(which node) bin/sbom-finder-macos

npx postject bin/sbom-finder-macos NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA

codesign --sign - --force bin/sbom-finder-macos
chmod +x bin/sbom-finder-macos

# Test
./bin/sbom-finder-macos --version
```

## Quick Sanity Check

Run this one-liner to see everything at once:

```bash
echo "Git: $(git log --oneline -1)" && \
echo "Bundle: $(node dist/bundle.cjs --version 2>&1 | head -1)" && \
echo "Executable: $(./bin/sbom-finder-macos --version 2>&1 | head -1)" && \
ls -lh bin/ dist/bundle.cjs sea-prep.blob 2>&1 | tail -3
```

**Expected output:**
```
Git: ac881ec Simplify macOS build: Apple Silicon only
Bundle: 0.1.0
Executable: 0.1.0
-rw-r--r--  1 user  staff   250K Apr 16 12:00 dist/bundle.cjs
-rw-r--r--  1 user  staff   400K Apr 16 12:00 sea-prep.blob
-rwxr-xr-x  1 user  staff    45M Apr 16 12:00 bin/sbom-finder-macos
```

If anything doesn't match, that's where the problem is.
