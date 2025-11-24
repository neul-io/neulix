import { build } from 'vite';
import { rmSync, existsSync } from 'fs';
import { resolve } from 'path';

async function buildProduction() {
  console.log('🏗️  Building for production...\n');

  const distPath = resolve(process.cwd(), 'dist');
  if (existsSync(distPath)) {
    console.log('🧹 Cleaning dist folder...');
    rmSync(distPath, { recursive: true, force: true });
  }

  console.log('📦 Building client bundle...\n');
  await build({
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  });

  console.log('\n✅ Build complete!\n');
  console.log('Run "bun start" to start the production server.');
}

buildProduction().catch(error => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
