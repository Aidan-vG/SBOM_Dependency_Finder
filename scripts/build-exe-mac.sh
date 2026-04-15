#!/bin/bash
# Build macOS executables using Node.js SEA
# Must be run on macOS

set -e

echo "🔨 Building macOS executables..."
echo ""

# Ensure we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "❌ This script must be run on macOS to create macOS executables"
  exit 1
fi

# Build the bundle first
echo "📦 Building bundle..."
npm run build:bundle

# Create bin directory
mkdir -p bin

# Step 1: Create the SEA configuration
echo "📋 Creating SEA configuration..."
cat > sea-config.json << EOF
{
  "main": "dist/bundle.cjs",
  "output": "sea-prep.blob",
  "disableExperimentalSEAWarning": true
}
EOF

# Step 2: Generate the blob
echo "📦 Generating SEA blob..."
node --experimental-sea-config sea-config.json

# Step 3: Create macOS executables
echo ""
echo "🍎 Creating macOS x64 executable..."
cp "$(command -v node)" bin/sbom-finder-macos-x64
npx postject bin/sbom-finder-macos-x64 NODE_SEA_BLOB sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
  --macho-segment-name NODE_SEA
codesign --sign - bin/sbom-finder-macos-x64
echo "  ✓ Created: bin/sbom-finder-macos-x64"

echo ""
echo "🍎 Creating macOS ARM64 executable..."
# For ARM64, we need to be running on Apple Silicon or use a different node binary
if [[ "$(uname -m)" == "arm64" ]]; then
  cp "$(command -v node)" bin/sbom-finder-macos-arm64
  npx postject bin/sbom-finder-macos-arm64 NODE_SEA_BLOB sea-prep.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA
  codesign --sign - bin/sbom-finder-macos-arm64
  echo "  ✓ Created: bin/sbom-finder-macos-arm64"
else
  echo "  ⚠️  Skipped (requires Apple Silicon hardware)"
fi

echo ""
echo "✅ macOS build complete!"
echo ""
echo "Executables created:"
ls -lh bin/sbom-finder-macos-*
