import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import { Glob } from 'bun';
import { pages } from '../src/pages/registry';

// Find client entry file for a page using glob pattern.
// Searches src/pages/**/*.client.tsx to support any folder structure.
async function findClientEntry(entryName: string): Promise<string | null> {
  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
  const pattern = `src/pages/**/${capitalizedEntry}.client.tsx`;
  const glob = new Glob(pattern);

  for await (const file of glob.scan('.')) {
    return resolve(process.cwd(), file);
  }

  return null;
}

interface BunBuildOutput {
  outputs: Array<{
    path: string;
    kind: 'entry-point' | 'chunk' | 'asset';
    hash: string | null;
  }>;
  success: boolean;
  logs: Array<{ message: string }>;
}

interface BuildManifest {
  [entryName: string]: {
    js?: string;
    css: string;
    imports?: string[];
  };
}

async function buildProduction() {
  console.log('Building for production...\n');

  const distPath = resolve(process.cwd(), 'dist');

  // Clean dist folder
  if (existsSync(distPath)) {
    console.log('Cleaning dist folder...');
    rmSync(distPath, { recursive: true, force: true });
  }
  mkdirSync(distPath, { recursive: true });

  // Build CSS with Tailwind CLI
  console.log('Building CSS with Tailwind...');
  const tailwindProcess = Bun.spawn([
    'bunx',
    'tailwindcss',
    '-i',
    'src/styles/input.css',
    '-o',
    'dist/styles.css',
    '--minify',
  ]);
  await tailwindProcess.exited;

  if (tailwindProcess.exitCode !== 0) {
    throw new Error('Tailwind CSS build failed');
  }

  // Add hash to CSS file
  const cssContent = await Bun.file('dist/styles.css').text();
  const cssHash = Bun.hash(cssContent).toString(16).slice(0, 8);
  const cssFileName = `styles-${cssHash}.css`;
  await Bun.write(`dist/${cssFileName}`, cssContent);
  rmSync('dist/styles.css');

  // Collect entry points for hydrated pages only
  const entrypoints: string[] = [];
  const entryNameMap: Map<string, string> = new Map();

  for (const [entryName, config] of Object.entries(pages)) {
    if (config.hydrate) {
      const entryPath = await findClientEntry(entryName);
      if (entryPath) {
        entrypoints.push(entryPath);
        entryNameMap.set(entryPath, entryName);
      } else {
        console.warn(`Warning: No .client.tsx file found for "${entryName}"`);
      }
    }
  }

  console.log('Building client bundles...');

  // Build all entries with Bun
  const result = (await Bun.build({
    entrypoints,
    outdir: 'dist',
    naming: '[name]-[hash].[ext]',
    splitting: true,
    minify: true,
    target: 'browser',
    format: 'esm',
    sourcemap: 'none',
    external: [],
  })) as BunBuildOutput;

  if (!result.success) {
    console.error('Build errors:');
    for (const log of result.logs) {
      console.error(log.message);
    }
    throw new Error('Build failed');
  }

  // Create manifest
  const manifest: BuildManifest = {};
  const chunks: string[] = [];

  for (const output of result.outputs) {
    const fileName = basename(output.path);

    if (output.kind === 'entry-point') {
      // Find which entry this corresponds to
      const entryPath = entrypoints.find(ep => {
        const name = basename(ep, '.client.tsx').toLowerCase();
        return fileName.toLowerCase().startsWith(name);
      });

      if (entryPath) {
        const entryName = entryNameMap.get(entryPath)!;
        manifest[entryName] = {
          js: fileName,
          css: cssFileName,
        };
      }
    } else if (output.kind === 'chunk') {
      chunks.push(fileName);
    }
  }

  // Add chunks as imports to all entries
  if (chunks.length > 0) {
    for (const entryName of Object.keys(manifest)) {
      manifest[entryName].imports = chunks;
    }
  }

  // Add SSR-only pages (CSS only, no JS)
  for (const [entryName, config] of Object.entries(pages)) {
    if (!config.hydrate) {
      manifest[entryName] = {
        css: cssFileName,
      };
    }
  }

  // Write manifest
  const manifestPath = resolve(distPath, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\nBuild complete!\n');
  console.log('Output:');
  console.log(`  CSS: ${cssFileName}`);
  for (const [name, assets] of Object.entries(manifest)) {
    if (assets.js) {
      console.log(`  ${name}: ${assets.js}`);
    } else {
      console.log(`  ${name}: (SSR-only, CSS only)`);
    }
  }
  if (chunks.length > 0) {
    console.log(`  Chunks: ${chunks.join(', ')}`);
  }
  console.log('\nRun "bun start" to start the production server.');
}

buildProduction().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
