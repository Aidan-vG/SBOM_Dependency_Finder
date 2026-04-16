# macOS Build Troubleshooting Guide

This guide addresses common issues when building the SBOM Dependency Finder on macOS.

**Requirements:** Apple Silicon Mac (M1/M2/M3) only. Intel Macs are not supported.

## Issue 1: "Multiple occurrences of sentinel found"

**Error message:**
```
Error: Multiple occurences of sentinel "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2" found in the binary
:x: Failed to create x64 executable
```

**Cause:** You're trying to inject the SEA blob into a Node binary that already has one embedded.

**Solution:**
```bash
# Remove old executables
rm -rf bin/

# Rebuild
npm run build:exe
```

The build script now automatically removes old executables, but if you encounter this error, manually deleting the bin/ folder will fix it.

---

## Issue 2: "Cannot find module" when running executable

**Error message:**
```
Error: Cannot find module '/Users/.../info'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1456:15)
```

**Cause:** The executable is being invoked incorrectly, treating the command as a file path.

**Incorrect:**
```bash
./bin/sbom-finder-macos-arm64 info test/fixtures/sample-sbom.json
```

**Correct:**
```bash
# The executable expects the full command after it
./bin/sbom-finder-macos info test/fixtures/sample-sbom.json

# Or run without arguments to enter interactive mode
./bin/sbom-finder-macos
```

**Why this happens:** The SEA (Single Executable Application) bundles the CLI code, and Commander.js expects arguments in a specific format.

**Workaround for testing:**
Just run the executable without arguments to enter interactive mode:
```bash
./bin/sbom-finder-macos
```

---

## Issue 3: Node.js REPL opens instead of the application

**Symptom:**
```
Welcome to Node.js v24.14.1.
Type ".help" for more information.
>
```

**Cause:** The SEA blob was not properly embedded or the executable is corrupted.

**Solution:**

1. **Clean rebuild:**
   ```bash
   # Remove all build artifacts
   rm -rf bin/ dist/ sea-prep.blob sea-config.json
   
   # Rebuild from scratch
   npm run build:exe
   ```

2. **Verify the blob was created:**
   ```bash
   ls -lh sea-prep.blob
   # Should show a file size of ~300KB or more
   ```

3. **Check if the injection worked:**
   ```bash
   # The executable should be much larger than node (30-50MB)
   ls -lh bin/sbom-finder-macos
   ```

4. **Test the executable:**
   ```bash
   ./bin/sbom-finder-macos --version
   # Should show version, not REPL
   ```

---

## Issue 4: "ERR_IMPORT_ATTRIBUTE_MISSING" error

**Error message:**
```
TypeError [ERR_IMPORT_ATTRIBUTE_MISSING]: Module "file:///.../sample-sbom.json" needs an import attribute of "type: json"
```

**Cause:** The bundler (esbuild) or Node.js version is treating JSON imports incorrectly.

**This should not happen** if the build was done correctly. The bundle should inline all JSON imports.

**Solution:**
```bash
# Ensure you're using Node.js 20 or later
node --version

# Clean rebuild
rm -rf dist/ sea-prep.blob
npm run build:bundle
npm run build:exe
```

---

## Issue 5: Permission denied when running executable

**Error message:**
```
permission denied: ./bin/sbom-finder-macos
```

**Cause:** The executable doesn't have execute permissions (this shouldn't happen if built correctly).

**Solution:**
```bash
chmod +x bin/sbom-finder-macos
./bin/sbom-finder-macos
```

---

## Issue 6: "cannot be opened because the developer cannot be verified"

**Cause:** macOS Gatekeeper is blocking the unsigned executable.

**Solution (for users):**
```bash
# Remove quarantine attribute
xattr -cr bin/sbom-finder-macos

# Or right-click → Open → Open (first time only)
```

**Solution (for builders):**
The build script should automatically code-sign with ad-hoc signature. If it fails:
```bash
# Manually code-sign
codesign --sign - --force bin/sbom-finder-macos
```

---

## Verification Checklist

After building, verify everything is working:

```bash
# 1. Check the executable exists and has correct size
ls -lh bin/
# Should show ~40-50MB file

# 2. Check it has execute permission
ls -l bin/sbom-finder-macos
# Should show -rwxr-xr-x (first x means executable)

# 3. Run with --help
./bin/sbom-finder-macos --help
# Should show usage information

# 4. Run interactive mode
./bin/sbom-finder-macos
# Should show interactive menu

# 5. Run with test data
./bin/sbom-finder-macos info test/fixtures/sample-sbom.json
# Should show SBOM information
```

---

## Still Having Issues?

1. **Check Node.js version:**
   ```bash
   node --version
   # Should be v20.0.0 or later
   ```

2. **Check npm version:**
   ```bash
   npm --version
   # Should be v10.0.0 or later
   ```

3. **Clean everything and start fresh:**
   ```bash
   # Remove all build artifacts
   rm -rf node_modules/ dist/ bin/ sea-prep.blob sea-config.json
   
   # Reinstall dependencies
   npm install
   
   # Rebuild
   npm run build:exe
   ```

4. **Try the source version first:**
   ```bash
   # If executables don't work, test the source version
   npx tsx src/index.ts info test/fixtures/sample-sbom.json
   
   # If this works, the issue is with the SEA build
   ```

---

## Getting Help

If none of these solutions work:

1. Note your macOS version: `sw_vers`
2. Note your Node.js version: `node --version`
3. Note your chip architecture: `uname -m`
4. Capture the full error message
5. Check if the source version works: `npx tsx src/index.ts --help`
6. Open an issue on GitHub with all this information
