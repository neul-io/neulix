import { build, Glob, type Subprocess, spawn } from 'bun';
import { existsSync, mkdirSync, rmSync, watch } from 'fs';
import { join, resolve } from 'path';
import type { PageConfig } from '../types';

export interface DevOptions {
  serverFile: string;
  pagesRegistry: string;
}

async function loadPages(pagesRegistry: string): Promise<Record<string, PageConfig>> {
  const registryPath = resolve(process.cwd(), pagesRegistry);
  const module = await import(registryPath);
  return module.pages;
}

async function findClientEntry(entryName: string): Promise<string | null> {
  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
  const pattern = `src/pages/**/${capitalizedEntry}.client.tsx`;
  const glob = new Glob(pattern);

  for await (const file of glob.scan('.')) {
    return resolve(process.cwd(), file);
  }

  return null;
}

export async function dev(options: DevOptions): Promise<void> {
  const { serverFile, pagesRegistry } = options;

  let serverProcess: Subprocess | null = null;
  let buildInProgress = false;

  const distPath = resolve(process.cwd(), 'dist');

  // Clean and recreate dist folder
  if (existsSync(distPath)) {
    rmSync(distPath, { recursive: true, force: true });
  }
  mkdirSync(distPath, { recursive: true });

  async function buildCss() {
    console.log('Building CSS...');

    const cssGlob = new Glob('src/styles/*.css');
    const cssFiles: string[] = [];
    for await (const file of cssGlob.scan('.')) {
      cssFiles.push(file);
    }

    const processes = cssFiles.map(async cssFile => {
      const baseName = cssFile.split('/').pop()!.replace('.css', '');
      const outputFile = `dist/${baseName}.css`;

      const tailwindProcess = spawn(['bunx', '@tailwindcss/cli', '-i', cssFile, '-o', outputFile], {
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...process.env,
          BROWSERSLIST_IGNORE_OLD_DATA: '1',
          NODE_NO_WARNINGS: '1',
        },
      });
      await tailwindProcess.exited;
      return { file: cssFile, exitCode: tailwindProcess.exitCode };
    });

    const results = await Promise.all(processes);
    const failed = results.filter(r => r.exitCode !== 0);

    if (failed.length > 0) {
      console.error('Tailwind CSS build failed for:', failed.map(f => f.file).join(', '));
    } else {
      console.log(`CSS built (${cssFiles.length} file${cssFiles.length !== 1 ? 's' : ''})`);
    }
  }

  async function buildClient() {
    if (buildInProgress) return;
    buildInProgress = true;

    console.log('Building client bundles...');

    const pages = await loadPages(pagesRegistry);
    const entrypoints: string[] = [];

    for (const [entryName, config] of Object.entries(pages)) {
      if (config.hydrate) {
        const entryPath = await findClientEntry(entryName);
        if (entryPath) {
          entrypoints.push(entryPath);
        } else {
          console.warn(`Warning: No .client.tsx file found for "${entryName}"`);
        }
      }
    }

    try {
      const result = await build({
        entrypoints,
        outdir: 'dist',
        naming: '[name].js',
        splitting: true,
        minify: false,
        target: 'browser',
        format: 'esm',
        sourcemap: 'inline',
      });

      if (!result.success) {
        console.error('Build errors:');
        for (const log of result.logs) {
          console.error(log.message);
        }
      } else {
        console.log('Client bundles rebuilt');
      }
    } catch (error) {
      console.error('Build error:', error);
    }

    buildInProgress = false;
  }

  function startServer() {
    if (serverProcess) {
      serverProcess.kill();
    }

    console.log('\nStarting server...\n');

    serverProcess = spawn({
      cmd: ['bun', 'run', serverFile],
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
    });
  }

  function restartServer() {
    console.log('\nFile change detected, restarting server...\n');
    startServer();
  }

  let rebuildTimeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleClientRebuild() {
    if (rebuildTimeout) {
      clearTimeout(rebuildTimeout);
    }
    rebuildTimeout = setTimeout(() => {
      buildClient();
      rebuildTimeout = null;
    }, 100);
  }

  let cssRebuildTimeout: ReturnType<typeof setTimeout> | null = null;

  function scheduleCssRebuild() {
    if (cssRebuildTimeout) {
      clearTimeout(cssRebuildTimeout);
    }
    cssRebuildTimeout = setTimeout(() => {
      buildCss();
      cssRebuildTimeout = null;
    }, 100);
  }

  const srcDir = join(process.cwd(), 'src');

  const watcher = watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;

    if (filename.endsWith('.css') || filename.endsWith('.tsx')) {
      scheduleCssRebuild();
    }

    if (
      filename.endsWith('server.ts') ||
      filename.includes('utils/') ||
      filename.includes('api/') ||
      (filename.includes('pages/') && !filename.endsWith('.client.tsx') && !filename.endsWith('.css'))
    ) {
      restartServer();
    }

    if (
      filename.endsWith('.client.tsx') ||
      filename.includes('client/') ||
      (filename.includes('pages/') && filename.endsWith('.tsx'))
    ) {
      scheduleClientRebuild();
    }

    if (filename.includes('registry.ts')) {
      restartServer();
      scheduleClientRebuild();
    }
  });

  process.on('SIGINT', () => {
    console.log('\nShutting down...\n');
    if (serverProcess) serverProcess.kill();
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    if (serverProcess) serverProcess.kill();
    watcher.close();
    process.exit(0);
  });

  console.log('Starting development environment...\n');

  await buildCss();
  await buildClient();
  startServer();

  console.log('\nWatching for file changes in src/...\n');
}
