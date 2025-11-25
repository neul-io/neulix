# Complete Repository File Structure and Technical Overview

This document provides a comprehensive technical breakdown of every file in the repository and the overall architecture.

## Architecture Overview

This is a **Multi-Page Application (MPA)** with:
- **React SSR** on server (renderToString with StrictMode)
- **React hydration** on client (per-page entry points)
- **Shared CSS** - One Tailwind CSS file cached across all pages
- **Per-page JS** - Each hydrated page has its own entry point and component bundle
- **Shared vendor chunk** - React cached and reused across pages
- **Optional hydration** - Pages can opt-out of JavaScript entirely (SSR-only)
- **SWC compilation** - Fast React transforms via @vitejs/plugin-react-swc

## Repository File Structure

```
test-vite-ssr/
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
│   │   ├── Home.css            #   Home page Tailwind styles
│   │   ├── Home.entry.tsx      #   Home page client entry (hydrated)
│   │   ├── About.tsx           #   About page React component
│   │   ├── About.css           #   About page Tailwind styles
│   │   ├── About.entry.tsx     #   About page client entry (hydrated)
│   │   ├── Docs.tsx            #   Docs page React component
│   │   ├── Docs.css            #   Docs page Tailwind styles (SSR-only, no entry)
│   │   └── registry.ts         #   Route → PageConfig mapping
│   │
│   ├── utils/                  # Shared utilities
│   │   ├── handler.ts          #   Express request handler factory
│   │   ├── ssr.ts              #   renderPage() - SSR with asset resolution
│   │   └── render.ts           #   HTML template, manifest parsing
│   │
│   ├── server.ts               # Express app setup and routing
│   ├── dev.ts                  # Development file watcher
│   ├── build.ts                # Production build script
│   └── types.ts                # TypeScript interfaces
│
├── vite.config.ts              # Vite bundler config (entries, chunks)
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
| `src/utils/` | Server | SSR rendering, HTML generation |
| `public/` | Browser | Static assets served unchanged |
| `dist/` | Browser | Vite build output (production only) |

## Build Output

```
dist/
├── .vite/
│   └── manifest.json           # Asset mapping
└── assets/
    ├── styles-[hash].css       # Shared Tailwind CSS (~7KB, cached)
    ├── vendor-[hash].js        # React + ReactDOM (~140KB, cached)
    ├── hydrate-[hash].js       # Shared hydration logic (~2KB)
    ├── home-[hash].js          # Home component (~1KB)
    └── about-[hash].js         # About component (~1KB)
```

**Note**: SSR-only pages (like Docs) have no JS output - only CSS.

---

## Key Design Decisions

### 1. Shared CSS File

**Decision**: One CSS file for all pages instead of per-page CSS.

**How it works**:
- Tailwind scans all source files and generates one CSS bundle
- Vite deduplicates identical CSS across entries
- Result: `styles-[hash].css` shared by all pages

**Trade-off**:
- ✅ CSS downloaded once, cached for all pages
- ✅ No CSS download on page navigation
- ❌ First load includes all classes (~7KB gzipped: ~2KB)

### 2. SSR-Only Pages

**Decision**: Pages with `hydrate: false` load zero JavaScript.

**How it works**:
- SSR-only pages only have a `.css` file as Vite input (no `.entry.tsx`)
- Manifest points directly to CSS file
- No JS tags included in HTML

**Vite config**:
```typescript
input: {
  // Hydrated pages
  home: resolve(__dirname, 'src/pages/Home.entry.tsx'),
  about: resolve(__dirname, 'src/pages/About.entry.tsx'),
  // SSR-only (CSS only, no JS)
  'docs-styles': resolve(__dirname, 'src/pages/Docs.css'),
}
```

### 3. Shared Hydration Utility

**Decision**: Centralized hydration with StrictMode.

**File**: `src/client/hydrate.tsx`
```typescript
import 'vite/modulepreload-polyfill';
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
import './Home.css';

hydrate(Home);
```

### 4. Clean Server Architecture

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

### src/utils/ssr.ts
**Purpose**: Server-side rendering with asset resolution

- Uses `React.createElement` (no JSX in .ts file)
- Wraps components in StrictMode
- Handles dev mode (Vite HMR preamble) vs production (manifest)
- Returns complete HTML string

### src/utils/render.ts
**Purpose**: Manifest parsing and HTML template

**Key functions**:
- `getPageAssetTags(manifest, entryName, hydrate)` - Resolves CSS/JS from manifest
- `collectCss()` - Recursively collects CSS from imports
- `collectModulePreloads()` - Generates modulepreload hints
- `createHtmlTemplate()` - Builds final HTML document

### src/api/index.ts
**Purpose**: Express router for API endpoints

```typescript
const api = Router();
api.get('/hello', hello);
export { api };
```

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
  - <link rel="modulepreload" href="/assets/hydrate-[hash].js">
  - <link rel="modulepreload" href="/assets/vendor-[hash].js">
  - <script src="/assets/home-[hash].js">
    ↓
Browser: CSS cached, vendor cached, hydrate cached
    ↓
Only home.js downloaded on subsequent visits
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

## Performance Characteristics

### Bundle Sizes

```
styles-[hash].css     7.20 KB (gzip: 1.98 KB) - Shared CSS
vendor-[hash].js    140.74 KB (gzip: 45.21 KB) - React (cached)
hydrate-[hash].js     1.79 KB (gzip: 0.99 KB) - Shared hydration
home-[hash].js        0.97 KB (gzip: 0.50 KB) - Home component
about-[hash].js       1.30 KB (gzip: 0.59 KB) - About component
```

### Load Behavior

**First Visit to Home**:
- styles.css: 2 KB (cached)
- vendor.js: 45 KB (cached)
- hydrate.js: 1 KB (cached)
- home.js: 0.5 KB
- **Total: ~49 KB**

**Navigate to About**:
- All cached except about.js
- **Total: ~0.6 KB**

**Visit Docs (SSR-only)**:
- styles.css: 0 KB (cached)
- **Total: 0 KB** (just HTML)

---

## Adding a New Hydrated Page

1. **Create component**: `src/pages/NewPage.tsx`

2. **Create CSS**: `src/pages/NewPage.css`
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **Create entry**: `src/pages/NewPage.entry.tsx`
   ```typescript
   import { hydrate } from '../client/hydrate';
   import NewPage from './NewPage';
   import './NewPage.css';

   hydrate(NewPage);
   ```

4. **Add to Vite config** (`vite.config.ts`):
   ```typescript
   input: {
     // ...existing entries
     newpage: resolve(__dirname, 'src/pages/NewPage.entry.tsx'),
   }
   ```

5. **Add to registry** (`src/pages/registry.ts`):
   ```typescript
   '/new-page': {
     component: NewPage,
     entryName: 'newpage',
     hydrate: true,
   },
   ```

## Adding an SSR-Only Page

1. **Create component**: `src/pages/Static.tsx`

2. **Create CSS**: `src/pages/Static.css`
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **Add CSS to Vite config** (no entry file needed):
   ```typescript
   input: {
     // ...existing entries
     'static-styles': resolve(__dirname, 'src/pages/Static.css'),
   }
   ```

4. **Add to registry**:
   ```typescript
   '/static': {
     component: Static,
     entryName: 'static',
     hydrate: false,  // No JS!
   },
   ```

---

## Tech Stack

- **Bun** - Runtime (native TypeScript/JSX)
- **Express** - HTTP server
- **Vite + SWC** - Build tool with fast React compilation
- **React 18** - UI library (SSR + hydration)
- **Tailwind** - CSS framework
- **TypeScript** - Type safety
