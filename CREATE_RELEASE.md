# How to Create GitHub Release v0.1.0

## Steps

1. **Go to GitHub Repository**
   - Navigate to: https://github.com/Aidan-vG/SBOM_Dependency_Finder

2. **Create New Release**
   - Click "Releases" in the right sidebar
   - Click "Create a new release"

3. **Release Details**
   - **Tag**: `v0.1.0` (create new tag)
   - **Target**: `main` branch
   - **Release title**: `SBOM Dependency Finder v0.1.0`
   - **Description**: Copy content from `RELEASE_NOTES.md`

4. **Attach Executables**
   Drag and drop the following files from `bin/` directory:
   - `sbom-finder.exe` (Windows executable, 92MB)
   - `checksums.txt` (SHA256 checksums)

   Note: macOS executables are not included as they require building on actual macOS hardware.

5. **Release Options**
   - ✅ Set as the latest release
   - ❌ Set as a pre-release (uncheck - this is a stable release)

6. **Publish**
   - Click "Publish release"

## After Publishing

Users can download the executable directly from:
https://github.com/Aidan-vG/SBOM_Dependency_Finder/releases/latest/download/sbom-finder.exe

## File Information

**sbom-finder.exe**
- Size: 92 MB
- SHA256: `239f5f623cec77c58db5b82c9c26dd747600b7608560fd36daca3a975a7bfd32`
- Platform: Windows 10/11 (x64)
- Node.js: Bundled (v25.9.0, targets Node 20 runtime)

## Verification

After release, test the download:
```bash
# Download
curl -L -o sbom-finder.exe https://github.com/Aidan-vG/SBOM_Dependency_Finder/releases/latest/download/sbom-finder.exe

# Verify checksum
sha256sum sbom-finder.exe

# Run
./sbom-finder.exe
```

## Future Releases

For macOS executables, run on a Mac:
```bash
git clone https://github.com/Aidan-vG/SBOM_Dependency_Finder.git
cd SBOM_Dependency_Finder
npm install
chmod +x scripts/build-exe-mac.sh
./scripts/build-exe-mac.sh
```

Then attach the generated `bin/sbom-finder-macos-*` files to the release.
