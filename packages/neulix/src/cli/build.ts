import { build, file, Glob, hash, spawn, write } from 'bun';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { basename, resolve } from 'path';
import type { PageConfig } from '../types';

export interface BuildOptions {
  pagesRegistry: string;
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

async function loadPages(pagesRegistry: string): Promise<Record<string, PageConfig>> {
  const registryPath = resolve(process.cwd(), pagesRegistry);
  const module = await import(registryPath);
  return module.pages;
}

async function findClientEntry(entryName: string): Promise<string | null> {
  // Use the registry key directly as a path (e.g., "console/Users" → "src/pages/console/Users.client.tsx")
  const clientPath = resolve(process.cwd(), `src/pages/${entryName}.client.tsx`);
  if (existsSync(clientPath)) {
    return clientPath;
  }
  return null;
}

export async function buildProduction(options: BuildOptions): Promise<void> {
  const { pagesRegistry } = options;

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

  const cssGlob = new Glob('src/styles/*.css');
  const cssFiles: string[] = [];
  for await (const cssFile of cssGlob.scan('.')) {
    cssFiles.push(cssFile);
  }

  const cssFileNames: Record<string, string> = {};

  for (const cssFile of cssFiles) {
    const baseName = cssFile.split('/').pop()!.replace('.css', '');
    const tempOutput = `dist/${baseName}.css`;

    const tailwindProcess = spawn(['bunx', '@tailwindcss/cli', '-i', cssFile, '-o', tempOutput, '--minify'], {
      stdout: 'ignore',
      stderr: 'ignore',
      env: {
        ...process.env,
        BROWSERSLIST_IGNORE_OLD_DATA: '1',
        NODE_NO_WARNINGS: '1',
      },
    });
    await tailwindProcess.exited;

    if (tailwindProcess.exitCode !== 0) {
      throw new Error(`Tailwind CSS build failed for ${cssFile}`);
    }

    const cssContent = await file(tempOutput).text();
    const cssHash = hash(cssContent).toString(16).slice(0, 8);
    const hashedFileName = `${baseName}-${cssHash}.css`;
    await write(`dist/${hashedFileName}`, cssContent);
    rmSync(tempOutput);

    cssFileNames[baseName] = hashedFileName;
  }

  const cssFileName = cssFileNames['input'] || cssFileNames['global'] || Object.values(cssFileNames)[0];

  const pages = await loadPages(pagesRegistry);
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

  const result = (await build({
    entrypoints,
    outdir: 'dist',
    root: 'src/pages',
    naming: '[dir]/[name]-[hash].[ext]',
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

  const manifest: BuildManifest = {};
  const chunks: string[] = [];

  for (const output of result.outputs) {
    // Get path relative to dist/ (e.g., "console/Users.client-abc123.js")
    const relativePath = output.path.replace(`${distPath}/`, '').replace(/\\/g, '/');

    if (output.kind === 'entry-point') {
      const entryPath = entrypoints.find(ep => {
        const name = basename(ep, '.client.tsx').toLowerCase();
        return basename(relativePath).toLowerCase().startsWith(name);
      });

      if (entryPath) {
        const entryName = entryNameMap.get(entryPath)!;
        manifest[entryName] = {
          js: relativePath,
          css: cssFileName,
        };
      }
    } else if (output.kind === 'chunk') {
      chunks.push(relativePath);
    }
  }

  if (chunks.length > 0) {
    for (const entryName of Object.keys(manifest)) {
      manifest[entryName].imports = chunks;
    }
  }

  for (const [entryName, config] of Object.entries(pages)) {
    if (!config.hydrate) {
      manifest[entryName] = {
        css: cssFileName,
      };
    }
  }

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
  console.log('\nRun "neulix start" to start the production server.');
}
