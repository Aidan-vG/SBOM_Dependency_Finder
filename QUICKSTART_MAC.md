# Quick Start for Mac Users

## Building on Your Mac (5 minutes)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aidan-vG/SBOM_Dependency_Finder.git
   cd SBOM_Dependency_Finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the executable**
   ```bash
   npm run build:exe
   ```

4. **Test it works**
   ```bash
   ./bin/sbom-finder-macos-arm64 --help
   ```

That's it! The executable is ready to use without `chmod +x`.

The build automatically creates the correct executable for your Mac:
- **Apple Silicon (M1/M2/M3)** → `bin/sbom-finder-macos-arm64`
- **Intel Mac** → `bin/sbom-finder-macos-x64`

## Packaging for distribution

Create a zip file to share with others:

```bash
npm run package
```

This creates `sbom-finder-macos-v0.1.0.zip` with your executable.

**Note:** To include both Intel and Apple Silicon versions, you need to build on both types of Macs and combine the executables before packaging.

## Full documentation

See [BUILD_MACOS.md](BUILD_MACOS.md) for detailed instructions and troubleshooting.
