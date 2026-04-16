# Quick Start for Mac Users

**Requirements:** Apple Silicon Mac (M1/M2/M3) only. Intel Macs are not supported.

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
   ./bin/sbom-finder-macos --help
   ```

That's it! The executable is ready to use without `chmod +x`.

## Packaging for distribution

Create a zip file to share with others:

```bash
npm run package
```

This creates `sbom-finder-macos-v0.1.0.zip` with the executable.

## Full documentation

See [BUILD_MACOS.md](BUILD_MACOS.md) for detailed instructions and troubleshooting.
