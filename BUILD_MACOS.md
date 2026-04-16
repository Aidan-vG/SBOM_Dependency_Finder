# Building macOS Executables

This guide explains how to build macOS executables for the SBOM Dependency Finder on your Mac.

## Prerequisites

1. **macOS computer** (Intel or Apple Silicon)
2. **Node.js installed** (v20 or later recommended)
3. **Terminal access**

## Step-by-Step Instructions

### 1. Transfer the project to your Mac

You can use one of these methods:

**Option A: Clone from GitHub (recommended)**
```bash
git clone https://github.com/Aidan-vG/SBOM_Dependency_Finder.git
cd SBOM_Dependency_Finder
```

**Option B: Copy via network/USB**
- Copy the entire project folder to your Mac
- Open Terminal and navigate to the project:
  ```bash
  cd /path/to/SBOM_Dependency_Finder
  ```

### 2. Install dependencies

```bash
npm install
```

This will install all required packages including the build tools.

### 3. Build the executables

Run the complete build process:

```bash
npm run build:exe
```

This will:
1. Compile TypeScript to JavaScript
2. Bundle the application
3. Create SEA (Single Executable Application) blob
4. Generate two macOS executables:
   - `bin/sbom-finder-macos-arm64` (for Apple Silicon M1/M2/M3)
   - `bin/sbom-finder-macos-x64` (for Intel Macs)
5. Code-sign both executables with ad-hoc signature

### 4. Verify the executables work

Test the executable for your architecture:

**For Apple Silicon (M1/M2/M3):**
```bash
./bin/sbom-finder-macos-arm64 --help
```

**For Intel Macs:**
```bash
./bin/sbom-finder-macos-x64 --help
```

You should see the help menu without needing to run `chmod +x`.

### 5. Test with sample data

```bash
./bin/sbom-finder-macos-arm64 info test/fixtures/sample-sbom.json
```

### 6. Package for distribution

To preserve executable permissions when distributing to users, create a zip file:

```bash
# Create a zip file with both architectures
cd bin
zip ../sbom-finder-macos-v0.1.0.zip sbom-finder-macos-arm64 sbom-finder-macos-x64
cd ..
```

When users unzip this file, the executables will retain their executable permission.

### 7. Transfer back to Windows

Copy the following files back to your Windows machine:
- `bin/sbom-finder-macos-arm64`
- `bin/sbom-finder-macos-x64`
- `sbom-finder-macos-v0.1.0.zip` (for distribution)

You can use:
- GitHub: Commit and push the binaries
- Cloud storage (OneDrive, Dropbox, etc.)
- USB drive
- Network share

## Troubleshooting

### "command not found: node"

Install Node.js:
```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org
```

### "command not found: npm"

NPM comes with Node.js. If it's missing, reinstall Node.js.

### Code signing fails

The build script uses ad-hoc signing (`codesign --sign -`) which doesn't require a developer certificate. If it fails:
- The executable will still work but may require `chmod +x` on first use
- Users can run: `chmod +x sbom-finder-macos-arm64`

### "cannot be opened because the developer cannot be verified"

Users seeing this message should:
1. Right-click the executable
2. Select "Open"
3. Click "Open" in the security dialog
4. Or run: `xattr -cr sbom-finder-macos-arm64` to remove quarantine attribute

## Distribution Best Practices

1. **Use .zip format** - Preserves executable permissions
2. **Include both architectures** - arm64 and x64
3. **Provide checksums** - For security verification
4. **Document architecture** - Help users choose the right binary:
   - M1/M2/M3 Macs → use `sbom-finder-macos-arm64`
   - Intel Macs → use `sbom-finder-macos-x64`

## Creating a GitHub Release

Once built, you can create a release with all platform binaries:

```bash
# On Windows
zip sbom-finder-windows-v0.1.0.zip bin/sbom-finder.exe

# On Mac (after building)
cd bin
zip ../sbom-finder-macos-v0.1.0.zip sbom-finder-macos-arm64 sbom-finder-macos-x64
```

Then upload both zip files to a GitHub release.
