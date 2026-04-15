import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function build() {
  console.log('🔨 Building standalone executable bundle...\n');

  // Create dist directory
  mkdirSync(join(rootDir, 'dist'), { recursive: true });

  // Bundle the application
  console.log('📦 Bundling with esbuild...');
  await esbuild.build({
    entryPoints: [join(rootDir, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: join(rootDir, 'dist/bundle.cjs'),
    format: 'cjs',
    external: [
      // These packages have native bindings and need to be external
    ],
    minify: false,
    sourcemap: false,
  });

  console.log('✅ Bundle created at dist/bundle.cjs\n');

  console.log('✅ Build configuration complete\n');
  console.log('Next steps:');
  console.log('  npm run build:exe  - Create executables for all platforms\n');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
