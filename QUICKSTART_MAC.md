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

## Which executable should I use?

- **M1/M2/M3 Mac (Apple Silicon)** → `bin/sbom-finder-macos-arm64`
- **Intel Mac** → `bin/sbom-finder-macos-x64`

Not sure? Run `uname -m`:
- `arm64` → use arm64 version
- `x86_64` → use x64 version

## Packaging for distribution

Create a zip file to share with others:

```bash
npm run package
```

This creates `sbom-finder-macos-v0.1.0.zip` with both executables.

## Full documentation

See [BUILD_MACOS.md](BUILD_MACOS.md) for detailed instructions and troubleshooting.
