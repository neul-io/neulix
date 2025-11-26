# Complete Repository File Structure and Technical Overview

This document provides a comprehensive technical breakdown of every file in the repository and the overall architecture.

## Architecture Overview

This is a **Multi-Page Application (MPA)** with:
- **React SSR** on server (renderToString with StrictMode)
- **React hydration** on client (per-page entry points)
- **Shared CSS** - One Tailwind CSS file cached across all pages
- **Per-page JS** - Each hydrated page has its own entry point and component bundle
- **Code splitting** - Bun bundler splits shared code into chunks
- **Optional hydration** - Pages can opt-out of JavaScript entirely (SSR-only)
- **Bun bundler** - Native bundling without Vite or Webpack
- **Tailwind CLI** - Direct CSS compilation with unused class removal

## Repository File Structure

```
bun-ssr/
├── public/                     # Static assets (served as-is)
│   └── favicon.svg
├── src/
│   ├── api/                    # API endpoints (Express Router)
│   │   ├── index.ts            #   Router that mounts all endpoints
│   │   └── hello.ts            #   GET /api/hello handler
│   │
│   ├── client/                 # Client-side code (browser only)
│   │   └── hydrate.tsx         #   Shared hydration with StrictMode
│   │
│   ├── pages/                  # Page components and routing
│   │   ├── Home.tsx            #   Home page React component
│   │   ├── Home.entry.tsx      #   Home page client entry (hydrated)
│   │   ├── About.tsx           #   About page React component
│   │   ├── About.entry.tsx     #   About page client entry (hydrated)
│   │   ├── Docs.tsx            #   Docs page React component (SSR-only)
│   │   └── registry.ts         #   Route → PageConfig mapping
│   │
│   ├── styles/                 # CSS source files
│   │   └── input.css           #   Tailwind entry point
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── handler.ts          #   Express request handler factory
│   │   ├── ssr.ts              #   renderPage() - SSR with asset resolution
│   │   └── render.ts           #   HTML template, manifest parsing
│   │
│   ├── server.ts               # Express app setup and routing
│   ├── dev.ts                  # Development watcher (Bun + Tailwind)
│   ├── build.ts                # Production build script
│   └── types.ts                # TypeScript interfaces
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
| `src/pages/` | Both | React components (SSR + hydrate), routing |
| `src/styles/` | Build | Tailwind CSS source |
| `src/utils/` | Server | SSR rendering, HTML generation |
| `public/` | Browser | Static assets served unchanged |
| `dist/` | Browser | Build output (production only) |

## Build Output

```
dist/
├── manifest.json               # Asset mapping (entry → files)
└── assets/
    ├── styles-[hash].css       # Shared Tailwind CSS (all pages)
    ├── Home.entry-[hash].js    # Home page entry
    ├── About.entry-[hash].js   # About page entry
    └── chunk-[hash].js         # Shared code (React, hydrate, etc.)
```

**Note**: SSR-only pages (like Docs) have no JS output - only CSS.

---

## Key Design Decisions

### 1. Bun Bundler (No Vite)

**Decision**: Use Bun's native bundler instead of Vite.

**How it works**:
- `Bun.build()` compiles all entry points
- Code splitting enabled via `splitting: true`
- React and shared code extracted to chunks automatically

**Benefits**:
- Zero npm dependencies for bundling
- Faster builds (native speed)
- Simpler configuration

### 2. Tailwind CLI (No PostCSS)

**Decision**: Use Tailwind CLI directly instead of PostCSS plugin.

**How it works**:
- `bunx tailwindcss -i src/styles/input.css -o dist/assets/styles.css`
- Scans all `.tsx` files for classes
- Removes unused classes automatically
- Single CSS file for all pages

**Dev mode**: `--watch` flag for live updates
**Prod mode**: `--minify` flag for optimization

### 3. Shared CSS File

**Decision**: One CSS file for all pages instead of per-page CSS.

**Trade-off**:
- ✅ CSS downloaded once, cached for all pages
- ✅ No CSS download on page navigation
- ❌ First load includes all classes

### 4. SSR-Only Pages

**Decision**: Pages with `hydrate: false` load zero JavaScript.

**How it works**:
- SSR-only pages don't have `.entry.tsx` files
- Build script skips them in entrypoints
- Manifest only includes CSS path
- No JS tags in HTML output

### 5. Shared Hydration Utility

**Decision**: Centralized hydration with StrictMode.

**File**: `src/client/hydrate.tsx`
```typescript
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

export function hydrate(Component: React.ComponentType): void {
  const root = document.getElementById('root');
  if (root) {
    hydrateRoot(root, <StrictMode><Component /></StrictMode>);
  }
}
```

**Entry files are minimal**:
```typescript
import { hydrate } from '../client/hydrate';
import Home from './Home';

hydrate(Home);
```

### 6. Clean Server Architecture

**Decision**: Separate concerns into focused modules.

| File | Purpose |
|------|---------|
| `server.ts` | Express setup, routing only |
| `utils/handler.ts` | Request handling, error handling |
| `utils/ssr.ts` | SSR rendering logic |
| `utils/render.ts` | HTML template, manifest parsing |

---

## Source Code Files

### src/server.ts
**Purpose**: Express HTTP server (routing only)

```typescript
// Static assets
app.use('/assets', express.static(join(process.cwd(), 'dist/assets')));

// API routes
app.use('/api', api);

// Page routes (explicit, not catch-all)
for (const [path, config] of Object.entries(pages)) {
  app.get(path, pageHandler(config));
}

// 404 handler
app.use((_req, res) => res.status(404).send('Page not found'));
```

### src/pages/registry.ts
**Purpose**: Single source of truth for page configuration

```typescript
export const pages: Record<string, PageConfig> = {
  '/': {
    component: Home,
    entryName: 'home',
    hydrate: true,
  },
  '/about': {
    component: About,
    entryName: 'about',
    hydrate: true,
  },
  '/docs': {
    component: Docs,
    entryName: 'docs',
    hydrate: false,  // SSR-only, zero JS
  },
};
```

### src/build.ts
**Purpose**: Production build with Bun bundler + Tailwind CLI

**Steps**:
1. Clean dist folder
2. Run Tailwind CLI with `--minify`
3. Add content hash to CSS filename
4. Collect hydrated page entrypoints from registry
5. Run `Bun.build()` with code splitting
6. Generate manifest.json mapping entries to assets

### src/dev.ts
**Purpose**: Development watcher

**Features**:
- Runs Tailwind CLI in watch mode
- Builds client bundles with inline sourcemaps
- Watches src/ for file changes
- Restarts server on server-side changes
- Rebuilds client on entry file changes

### src/utils/ssr.ts
**Purpose**: Server-side rendering with asset resolution

- Uses `React.createElement` (no JSX in .ts file)
- Wraps components in StrictMode
- Dev mode: uses unversioned filenames
- Prod mode: reads manifest for hashed filenames

### src/utils/render.ts
**Purpose**: Manifest parsing and HTML template

**Key functions**:
- `getPageAssetTags(manifest, entryName, hydrate)` - Resolves CSS/JS from manifest
- `createHtmlTemplate()` - Builds final HTML document

---

## Data Flow

### Hydrated Page (Production)

```
Browser: GET /
    ↓
Express routes to pageHandler(homeConfig)
    ↓
renderPage() → createElement(StrictMode, createElement(Home))
    ↓
getPageAssetTags(manifest, 'home', true)
    ↓
HTML with:
  - <link href="/assets/styles-[hash].css">
  - <link rel="modulepreload" href="/assets/chunk-[hash].js">
  - <script src="/assets/Home.entry-[hash].js">
    ↓
Browser: CSS cached, chunks cached
    ↓
Only entry JS downloaded on subsequent page visits
```

### SSR-Only Page (Production)

```
Browser: GET /docs
    ↓
Express routes to pageHandler(docsConfig)
    ↓
renderPage() → createElement(StrictMode, createElement(Docs))
    ↓
getPageAssetTags(manifest, 'docs', false)
    ↓
HTML with:
  - <link href="/assets/styles-[hash].css">
  - NO <script> tags
  - NO modulepreload hints
    ↓
Browser: Renders static HTML + cached CSS
    ↓
Zero JavaScript executed
```

---

## Adding a New Hydrated Page

1. **Create component**: `src/pages/NewPage.tsx`

2. **Create entry**: `src/pages/NewPage.entry.tsx`
   ```typescript
   import { hydrate } from '../client/hydrate';
   import NewPage from './NewPage';

   hydrate(NewPage);
   ```

3. **Add to registry** (`src/pages/registry.ts`):
   ```typescript
   import NewPage from './NewPage';

   // In pages object:
   '/new-page': {
     component: NewPage,
     entryName: 'newpage',
     hydrate: true,
   },
   ```

That's it! The build script automatically discovers entries from the registry.

## Adding an SSR-Only Page

1. **Create component**: `src/pages/Static.tsx`

2. **Add to registry** (no entry file needed):
   ```typescript
   import Static from './Static';

   // In pages object:
   '/static': {
     component: Static,
     entryName: 'static',
     hydrate: false,  // No JS!
   },
   ```

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run src/dev.ts` | Start dev server with watch |
| `build` | `bun run src/build.ts` | Production build |
| `start` | `NODE_ENV=production bun run src/server.ts` | Start production server |

---

## Tech Stack

- **Bun** - Runtime + bundler (native TypeScript/JSX)
- **Express** - HTTP server
- **React 18** - UI library (SSR + hydration)
- **Tailwind CLI** - CSS framework with JIT compilation
- **TypeScript** - Type safety
