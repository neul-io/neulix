import { watch, existsSync, mkdirSync } from 'fs';
import { spawn, type Subprocess } from 'bun';
import { join, resolve } from 'path';
import { pages } from './pages/registry';

let serverProcess: Subprocess | null = null;
let buildInProgress = false;

const distPath = resolve(process.cwd(), 'dist');

// Ensure dist exists
if (!existsSync(distPath)) {
  mkdirSync(distPath, { recursive: true });
}

async function buildCss() {
  console.log('Building CSS...');
  const tailwindProcess = Bun.spawn([
    'bunx',
    'tailwindcss',
    '-i',
    'src/styles/input.css',
    '-o',
    'dist/styles.css',
  ]);
  await tailwindProcess.exited;

  if (tailwindProcess.exitCode !== 0) {
    console.error('Tailwind CSS build failed');
  } else {
    console.log('CSS built');
  }
}

async function buildClient() {
  if (buildInProgress) return;
  buildInProgress = true;

  console.log('Building client bundles...');

  // Collect entry points for hydrated pages only
  const entrypoints: string[] = [];

  for (const [entryName, config] of Object.entries(pages)) {
    if (config.hydrate) {
      const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
      const entryPath = resolve(process.cwd(), `src/pages/${capitalizedEntry}.entry.tsx`);
      entrypoints.push(entryPath);
    }
  }

  try {
    const result = await Bun.build({
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
    cmd: ['bun', 'run', 'src/server.ts'],
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

// Debounce for client rebuilds
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

// Debounce for CSS rebuilds
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

  // CSS files or component changes: rebuild CSS (Tailwind scans for classes)
  if (filename.endsWith('.css') || filename.endsWith('.tsx')) {
    scheduleCssRebuild();
  }

  // Server-side files: restart server
  if (
    filename.endsWith('server.ts') ||
    filename.includes('utils/') ||
    filename.includes('api/') ||
    (filename.includes('pages/') && !filename.endsWith('.entry.tsx') && !filename.endsWith('.css'))
  ) {
    restartServer();
    return;
  }

  // Client-side files: rebuild bundles
  if (filename.endsWith('.entry.tsx') || filename.includes('client/')) {
    scheduleClientRebuild();
  }

  // Registry changes: restart server and rebuild
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

// Initial build and start
await buildCss();
await buildClient();
startServer();

console.log('\nWatching for file changes in src/...\n');
