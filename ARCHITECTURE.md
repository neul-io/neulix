# MPA with React SSR, Bun Bundler, and Selective Hydration

This document provides a comprehensive technical breakdown for implementing this architecture.

## Architecture Overview

This is a **Multi-Page Application (MPA)** with:
- **React SSR** on server (`renderToString` with `StrictMode`)
- **React hydration** on client (per-page entry points)
- **Selective hydration** - Pages can opt-out of JavaScript entirely (SSR-only)
- **Shared CSS** - One Tailwind CSS file cached across all pages
- **Per-page JS** - Each hydrated page has its own entry bundle
- **Code splitting** - Bun bundler extracts shared code (React) into chunks
- **Bun bundler** - Native bundling without Vite or Webpack
- **Tailwind CLI** - Direct CSS compilation with unused class removal

## Repository File Structure

```
project/
├── public/                     # Static assets (served as-is)
│   └── favicon.svg
├── src/
│   ├── api/                    # API endpoints (Express Router)
│   │   ├── index.ts            #   Router that mounts all endpoints
│   │   └── hello.ts            #   GET /api/hello handler
│   │
│   ├── client/                 # Client-side code (browser only)
│   │   └── hydrate.tsx         #   Shared hydration utility
│   │
│   ├── pages/                  # Page components and routing
│   │   ├── Home.tsx            #   Home page React component
│   │   ├── Home.entry.tsx      #   Home page client entry (hydrated)
│   │   ├── Home.css            #   Home page styles (optional)
│   │   ├── About.tsx           #   About page React component
│   │   ├── About.entry.tsx     #   About page client entry (hydrated)
│   │   ├── Docs.tsx            #   Docs page React component (SSR-only, no entry!)
│   │   └── registry.ts         #   Page configuration registry
│   │
│   ├── styles/                 # CSS source files
│   │   └── input.css           #   Tailwind entry point (@tailwind directives)
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── ssr.ts              #   renderPage() - SSR with asset resolution
│   │   └── render.ts           #   HTML template, manifest parsing
│   │
│   ├── server.ts               # Express app setup and explicit routing
│   ├── dev.ts                  # Development watcher (Bun + Tailwind)
│   ├── build.ts                # Production build script
│   └── types.ts                # TypeScript interfaces
│
├── dist/                       # Build output (gitignored)
│   ├── manifest.json           #   Asset mapping for production
│   ├── styles-[hash].css       #   Hashed CSS (production)
│   ├── styles.css              #   Unhashed CSS (development)
│   ├── Home.entry-[hash].js    #   Page entry bundles
│   └── chunk-[hash].js         #   Shared chunks (React, etc.)
│
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies and scripts
```

## Folder Responsibilities

| Folder | Runs On | Purpose |
|--------|---------|---------|
| `src/api/` | Server | REST API endpoints, Express routers |
| `src/client/` | Browser | Client-only code, hydration utilities |
| `src/pages/` | Both | React components (SSR + hydrate), page registry |
| `src/styles/` | Build | Tailwind CSS source |
| `src/utils/` | Server | SSR rendering, HTML generation |
| `public/` | Browser | Static assets served unchanged |
| `dist/` | Browser | Build output |

---

## Key Files

### src/types.ts

```typescript
export interface BuildManifest {
  [entryName: string]: {
    js?: string;
    css: string;
    imports?: string[];
  };
}

export interface PageConfig {
  component: React.ComponentType;
  url: string;
  hydrate: boolean;
}
```

### src/pages/registry.ts

The registry uses **entry name as key** with `url` and `hydrate` properties:

```typescript
import type { PageConfig } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

export const pages: Record<string, PageConfig> = {
  home: {
    component: Home,
    url: '/',
    hydrate: true,
  },
  about: {
    component: About,
    url: '/about',
    hydrate: true,
  },
  docs: {
    component: Docs,
    url: '/docs',
    hydrate: false,  // SSR-only, zero JS
  },
};
```

### src/server.ts

Routes are **explicitly defined** (not iterated from registry for security):

```typescript
import express, { type Request, type Response } from 'express';
import { join } from 'path';
import { renderPage } from './utils/ssr';
import { api } from './api';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// Serve static assets
app.use(express.static(join(process.cwd(), 'dist')));
app.use(express.static(join(process.cwd(), 'public')));

// API routes
app.use('/api', api);

// Page routes - EXPLICITLY DEFINED (security best practice)
app.get('/', (_req: Request, res: Response) => {
  res.send(renderPage('home'));
});

app.get('/about', (_req: Request, res: Response) => {
  res.send(renderPage('about'));
});

app.get('/docs', (_req: Request, res: Response) => {
  res.send(renderPage('docs'));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development' : 'production'}`);
});
```

### src/utils/ssr.ts

```typescript
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHtmlTemplate, getPageAssetTags } from './render';
import { pages } from '../pages/registry';
import type { BuildManifest } from '../types';

const isDev = process.env.NODE_ENV !== 'production';

// Load manifest once at startup in production
let manifest: BuildManifest | undefined;
if (!isDev) {
  const manifestPath = join(process.cwd(), 'dist/manifest.json');
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }
}

export function renderPage(entryName: string): string {
  const pageConfig = pages[entryName];
  if (!pageConfig) {
    throw new Error(`Page not found: ${entryName}`);
  }

  const appHtml = renderToString(
    createElement(StrictMode, null, createElement(pageConfig.component))
  );

  let scriptTags = '';
  let cssTags = '';
  let preloadTags = '';

  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);

  if (isDev) {
    cssTags = '<link rel="stylesheet" href="/styles.css">';

    if (pageConfig.hydrate) {
      scriptTags = `<script type="module" src="/${capitalizedEntry}.entry.js"></script>`;
    }
  } else if (manifest) {
    const assets = getPageAssetTags(manifest, entryName, pageConfig.hydrate);
    cssTags = assets.cssTags;
    preloadTags = assets.preloadTags;
    scriptTags = assets.scriptTags;
  }

  return createHtmlTemplate(appHtml, scriptTags, cssTags, preloadTags);
}
```

### src/utils/render.ts

```typescript
import type { BuildManifest } from '../types';

export function getPageAssetTags(
  manifest: BuildManifest,
  entryName: string,
  hydrate: boolean
): { cssTags: string; preloadTags: string; scriptTags: string } {
  const entry = manifest[entryName];
  if (!entry) {
    return { cssTags: '', preloadTags: '', scriptTags: '' };
  }

  const cssTags = `<link rel="stylesheet" href="/${entry.css}">`;

  if (!hydrate) {
    return { cssTags, preloadTags: '', scriptTags: '' };
  }

  let preloadTags = '';
  let scriptTags = '';

  // Preload chunks
  if (entry.imports) {
    preloadTags = entry.imports
      .map(chunk => `<link rel="modulepreload" href="/${chunk}">`)
      .join('\n    ');
  }

  // Entry script
  if (entry.js) {
    scriptTags = `<script type="module" src="/${entry.js}"></script>`;
  }

  return { cssTags, preloadTags, scriptTags };
}

export function createHtmlTemplate(
  appHtml: string,
  scriptTags: string,
  cssTags: string,
  preloadTags: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>App</title>
    ${cssTags}
    ${preloadTags}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    ${scriptTags}
  </body>
</html>`;
}
```

### src/client/hydrate.tsx

```typescript
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

export function hydrate(Component: React.ComponentType): void {
  const root = document.getElementById('root');
  if (root) {
    hydrateRoot(
      root,
      <StrictMode>
        <Component />
      </StrictMode>
    );
  }
}
```

### src/pages/Home.entry.tsx (example entry file)

```typescript
import { hydrate } from '../client/hydrate';
import Home from './Home';

hydrate(Home);
```

### src/build.ts

Production build with content-hashed filenames:

```typescript
import { rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import { pages } from './pages/registry';

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
    rmSync(distPath, { recursive: true, force: true });
  }
  mkdirSync(distPath, { recursive: true });

  // Build CSS with Tailwind CLI (minified)
  console.log('Building CSS with Tailwind...');
  const tailwindProcess = Bun.spawn([
    'bunx', 'tailwindcss',
    '-i', 'src/styles/input.css',
    '-o', 'dist/styles.css',
    '--minify',
  ]);
  await tailwindProcess.exited;

  // Add content hash to CSS filename for cache busting
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
      const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
      const entryPath = resolve(process.cwd(), `src/pages/${capitalizedEntry}.entry.tsx`);
      entrypoints.push(entryPath);
      entryNameMap.set(entryPath, entryName);
    }
  }

  console.log('Building client bundles...');

  // Build all entries with Bun bundler
  const result = await Bun.build({
    entrypoints,
    outdir: 'dist',
    naming: '[name]-[hash].[ext]',
    splitting: true,        // Enable code splitting (React goes to chunk)
    minify: true,
    target: 'browser',
    format: 'esm',
    sourcemap: 'none',
  });

  if (!result.success) {
    throw new Error('Build failed');
  }

  // Generate manifest
  const manifest: BuildManifest = {};
  const chunks: string[] = [];

  for (const output of result.outputs) {
    const fileName = basename(output.path);

    if (output.kind === 'entry-point') {
      const entryPath = entrypoints.find(ep => {
        const name = basename(ep, '.entry.tsx').toLowerCase();
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
  writeFileSync(resolve(distPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('\nBuild complete!');
}

buildProduction();
```

### src/dev.ts

Development watcher with file change detection:

```typescript
import { watch, existsSync, mkdirSync } from 'fs';
import { spawn, type Subprocess } from 'bun';
import { join, resolve } from 'path';
import { pages } from './pages/registry';

let serverProcess: Subprocess | null = null;
let buildInProgress = false;

const distPath = resolve(process.cwd(), 'dist');

if (!existsSync(distPath)) {
  mkdirSync(distPath, { recursive: true });
}

async function buildCss() {
  console.log('Building CSS...');
  const tailwindProcess = Bun.spawn([
    'bunx', 'tailwindcss',
    '-i', 'src/styles/input.css',
    '-o', 'dist/styles.css',
  ]);
  await tailwindProcess.exited;
  console.log('CSS built');
}

async function buildClient() {
  if (buildInProgress) return;
  buildInProgress = true;

  console.log('Building client bundles...');

  const entrypoints: string[] = [];

  for (const [entryName, config] of Object.entries(pages)) {
    if (config.hydrate) {
      const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
      const entryPath = resolve(process.cwd(), `src/pages/${capitalizedEntry}.entry.tsx`);
      entrypoints.push(entryPath);
    }
  }

  await Bun.build({
    entrypoints,
    outdir: 'dist',
    naming: '[name].js',
    splitting: true,
    minify: false,
    target: 'browser',
    format: 'esm',
    sourcemap: 'inline',
  });

  console.log('Client bundles rebuilt');
  buildInProgress = false;
}

function startServer() {
  if (serverProcess) serverProcess.kill();

  console.log('\nStarting server...\n');

  serverProcess = spawn({
    cmd: ['bun', 'run', 'src/server.ts'],
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
}

// Debounced rebuilds
let rebuildTimeout: ReturnType<typeof setTimeout> | null = null;
let cssRebuildTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleClientRebuild() {
  if (rebuildTimeout) clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => buildClient(), 100);
}

function scheduleCssRebuild() {
  if (cssRebuildTimeout) clearTimeout(cssRebuildTimeout);
  cssRebuildTimeout = setTimeout(() => buildCss(), 100);
}

const srcDir = join(process.cwd(), 'src');

watch(srcDir, { recursive: true }, (eventType, filename) => {
  if (!filename) return;

  // CSS or component changes: rebuild Tailwind
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
    console.log('\nFile change detected, restarting server...\n');
    startServer();
    return;
  }

  // Client-side files: rebuild bundles
  if (filename.endsWith('.entry.tsx') || filename.includes('client/')) {
    scheduleClientRebuild();
  }

  // Registry changes: restart server and rebuild
  if (filename.includes('registry.ts')) {
    startServer();
    scheduleClientRebuild();
  }
});

// Cleanup on exit
process.on('SIGINT', () => {
  if (serverProcess) serverProcess.kill();
  process.exit(0);
});

console.log('Starting development environment...\n');

await buildCss();
await buildClient();
startServer();

console.log('\nWatching for file changes in src/...\n');
```

---

## Build Output

### Development (dist/)
```
dist/
├── styles.css              # Unhashed (no cache busting needed)
├── Home.entry.js           # Unhashed entry
├── About.entry.js
└── chunk-*.js              # Shared chunks
```

### Production (dist/)
```
dist/
├── manifest.json           # Maps entry names to hashed files
├── styles-9de07fa6.css     # Content-hashed CSS
├── Home.entry-jp8r3x4m.js  # Content-hashed entries
├── About.entry-j043rfve.js
└── chunk-9axpccjb.js       # Shared chunk (React + hydration)
```

### manifest.json Example
```json
{
  "home": {
    "js": "Home.entry-jp8r3x4m.js",
    "css": "styles-9de07fa6.css",
    "imports": ["chunk-9axpccjb.js"]
  },
  "about": {
    "js": "About.entry-j043rfve.js",
    "css": "styles-9de07fa6.css",
    "imports": ["chunk-9axpccjb.js"]
  },
  "docs": {
    "css": "styles-9de07fa6.css"
  }
}
```

Note: SSR-only pages (`docs`) have no `js` or `imports` - only CSS.

---

## Data Flow

### Hydrated Page Request (Production)

```
Browser: GET /
    ↓
Express matches explicit route: app.get('/')
    ↓
renderPage('home') called
    ↓
pages['home'] looked up → { component: Home, hydrate: true }
    ↓
renderToString(createElement(StrictMode, createElement(Home)))
    ↓
getPageAssetTags(manifest, 'home', true) resolves hashed filenames
    ↓
HTML returned with:
  - <link href="/styles-9de07fa6.css">
  - <link rel="modulepreload" href="/chunk-9axpccjb.js">
  - <script src="/Home.entry-jp8r3x4m.js">
    ↓
Browser loads cached CSS, cached chunks
    ↓
Entry JS hydrates the page with React
```

### SSR-Only Page Request (Production)

```
Browser: GET /docs
    ↓
Express matches explicit route: app.get('/docs')
    ↓
renderPage('docs') called
    ↓
pages['docs'] looked up → { component: Docs, hydrate: false }
    ↓
renderToString(createElement(StrictMode, createElement(Docs)))
    ↓
getPageAssetTags(manifest, 'docs', false) returns CSS only
    ↓
HTML returned with:
  - <link href="/styles-9de07fa6.css">
  - NO <script> tags
    ↓
Browser renders static HTML + cached CSS
    ↓
ZERO JavaScript executed
```

---

## Adding a New Page

### Hydrated Page (with JavaScript)

1. **Create component**: `src/pages/NewPage.tsx`
   ```typescript
   export default function NewPage() {
     return <div>New Page</div>;
   }
   ```

2. **Create entry**: `src/pages/NewPage.entry.tsx`
   ```typescript
   import { hydrate } from '../client/hydrate';
   import NewPage from './NewPage';

   hydrate(NewPage);
   ```

3. **Add to registry** (`src/pages/registry.ts`):
   ```typescript
   import NewPage from './NewPage';

   export const pages: Record<string, PageConfig> = {
     // ... existing pages
     newpage: {
       component: NewPage,
       url: '/new-page',
       hydrate: true,
     },
   };
   ```

4. **Add route** (`src/server.ts`):
   ```typescript
   app.get('/new-page', (_req: Request, res: Response) => {
     res.send(renderPage('newpage'));
   });
   ```

### SSR-Only Page (zero JavaScript)

1. **Create component**: `src/pages/Static.tsx`

2. **Add to registry** (NO entry file needed):
   ```typescript
   import Static from './Static';

   export const pages: Record<string, PageConfig> = {
     // ... existing pages
     static: {
       component: Static,
       url: '/static',
       hydrate: false,  // No JS!
     },
   };
   ```

3. **Add route** (`src/server.ts`):
   ```typescript
   app.get('/static', (_req: Request, res: Response) => {
     res.send(renderPage('static'));
   });
   ```

---

## Key Design Decisions

### 1. Explicit Routes (Security)

Routes are defined explicitly in `server.ts`, NOT iterated from the registry. This prevents potential security issues where an attacker could manipulate the registry to expose unintended routes.

### 2. Entry Name as Registry Key

The registry uses entry name as key (`home`, `about`, `docs`) with a `url` property. This makes lookups simple: `pages[entryName]`.

### 3. Content-Hashed Filenames (Production)

All production assets have content hashes in filenames. When content changes, the filename changes, forcing browsers to fetch the new version. This enables aggressive caching (`Cache-Control: max-age=31536000`).

### 4. Single CSS File

One Tailwind CSS file serves all pages. Trade-off:
- **Pro**: CSS cached on first visit, no additional downloads on navigation
- **Con**: First load includes all classes (mitigated by Tailwind's purging)

### 5. Shared Chunk for React

Bun's code splitting extracts React and shared code into a chunk. Users download React once and it's cached for all pages.

### 6. renderToString (Synchronous SSR)

Uses synchronous `renderToString` for simplicity. For high-traffic sites with heavy components, consider `renderToPipeableStream` for streaming SSR.

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run src/dev.ts` | Start dev server with file watching |
| `build` | `bun run src/build.ts` | Production build |
| `start` | `NODE_ENV=production bun run src/server.ts` | Start production server |

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.x",
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "@types/express": "^4.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "tailwindcss": "^3.x",
    "typescript": "^5.x"
  }
}
```

No Vite, Webpack, or other bundlers needed - Bun handles everything.
