# Neulix Framework - Architecture & Technical Documentation

This document provides a comprehensive technical breakdown for implementing and contributing to the Neulix framework.

---

For project philosophy, user guide, and quick start instructions, see [README.md](./README.md).

---

## Monorepo Structure

```
neulix/
├── packages/
│   ├── neulix/                    # Core framework library
│   │   ├── src/
│   │   │   ├── index.ts           #   Main exports (renderPage, createPages)
│   │   │   ├── types.ts           #   TypeScript interfaces
│   │   │   ├── ssr.ts             #   Server-side rendering utilities
│   │   │   ├── render.ts          #   HTML template generation
│   │   │   ├── cli/               #   CLI commands (dev, build, start)
│   │   │   │   ├── index.ts       #     CLI entry point
│   │   │   │   ├── dev.ts         #     Development server
│   │   │   │   └── build.ts       #     Production build
│   │   │   ├── client/            #   Client-side code
│   │   │   │   └── hydrate.tsx    #     Hydration utility
│   │   │   ├── components/        #   Built-in components
│   │   │   │   └── error-boundary.tsx
│   │   │   └── middleware/        #   Framework middleware
│   │   │       └── express.ts     #     Express static assets middleware
│   │   └── package.json
│   │
│   └── create-neulix/             # Scaffolding tool (bunx create-neulix)
│       ├── src/
│       │   └── index.ts           #   CLI for project creation
│       ├── template/              #   Project template files
│       │   ├── src/
│       │   │   ├── server.ts
│       │   │   ├── pages/
│       │   │   ├── components/
│       │   │   ├── api/
│       │   │   └── styles/
│       │   └── public/
│       └── package.json
│
├── apps/
│   └── example/                   # Example application for testing
│       ├── src/
│       │   ├── server.ts
│       │   ├── pages/
│       │   ├── components/
│       │   ├── api/
│       │   └── styles/
│       └── package.json
│
├── package.json                   # Root workspace config
└── tsconfig.json                  # Shared TypeScript config
```

---

## Package Exports

### neulix (main package)

| Export Path | Import | Purpose |
|-------------|--------|---------|
| `neulix` | `import { renderPage, createPages } from 'neulix'` | Core SSR utilities |
| `neulix/client` | `import { hydrate } from 'neulix/client'` | Client-side hydration |
| `neulix/express` | `import { staticAssets } from 'neulix/express'` | Express middleware |
| `neulix/cli` | CLI binary | Development and build commands |

### create-neulix

| Command | Purpose |
|---------|---------|
| `bunx create-neulix my-app` | Scaffold a new Neulix project |

---

## CLI Commands

The `neulix` CLI provides three commands:

### neulix dev

Starts development server with hot reload.

```bash
neulix dev
neulix dev --server=src/server.ts
neulix dev --pages=src/pages/registry.ts
```

| Option | Default | Description |
|--------|---------|-------------|
| `--server` | `src/server.ts` | Server entry file path |
| `--pages` | `src/pages/registry.ts` | Pages registry file path |

**What it does:**
1. Cleans and recreates `dist/` folder
2. Builds CSS from `src/styles/*.css` using Tailwind CLI
3. Builds client bundles for hydrated pages
4. Starts the server process
5. Watches `src/` for changes and rebuilds/restarts as needed

### neulix build

Creates production-optimized build.

```bash
neulix build
neulix build --pages=src/pages/registry.ts
```

| Option | Default | Description |
|--------|---------|-------------|
| `--pages` | `src/pages/registry.ts` | Pages registry file path |

**What it does:**
1. Cleans `dist/` folder
2. Builds and minifies CSS with content hashing
3. Builds client bundles with code splitting and minification
4. Generates `manifest.json` for asset resolution

### neulix start

Starts production server.

```bash
neulix start
neulix start --server=src/server.ts
```

| Option | Default | Description |
|--------|---------|-------------|
| `--server` | `src/server.ts` | Server entry file path |

---

## Application Architecture

A Neulix application follows this structure:

```
my-app/
├── src/
│   ├── server.ts              # Express app and routes (required)
│   ├── pages/                 # Page components (required)
│   │   ├── registry.ts        #   Page configuration registry
│   │   ├── Home.tsx           #   Page component
│   │   ├── Home.client.tsx    #   Client entry (if hydrated)
│   │   └── Docs.tsx           #   SSR-only page (no .client.tsx)
│   ├── components/            # Shared components (optional)
│   ├── api/                   # API routes (optional)
│   └── styles/                # CSS files (required)
│       └── global.css         #   Main stylesheet
├── public/                    # Static assets
├── dist/                      # Build output (gitignored)
└── package.json
```

---

## Core Concepts

### Page Registry (registry.ts)

The registry defines all pages and their hydration behavior:

```typescript
import { createPages } from 'neulix';
import Home from './Home';
import Docs from './Docs';

export const pages = createPages({
  home: {
    component: Home,
    hydrate: true,    // Ships JavaScript, becomes interactive
  },
  docs: {
    component: Docs,
    hydrate: false,   // SSR-only, zero JavaScript
  },
});
```

**Key points:**
- `createPages()` auto-injects `name` property from object keys
- `hydrate: true` requires a corresponding `.client.tsx` file
- `hydrate: false` pages ship no JavaScript (pure SSR)

### Client Entry Files (*.client.tsx)

Hydrated pages need a client entry file:

```typescript
// src/pages/Home.client.tsx
import { hydrate } from 'neulix/client';
import Home from './Home';

hydrate(Home);
```

**Naming convention:**
- Component: `Home.tsx`
- Client entry: `Home.client.tsx`
- Registry key: `home` (lowercase)

### Server Entry (server.ts)

The server is a standard Express application:

```typescript
import express, { type Request, type Response } from 'express';
import { renderPage } from 'neulix';
import { staticAssets } from 'neulix/express';
import { pages } from './pages/registry';

const app = express();

// Serve static assets (dist/ and public/)
staticAssets(app);

// Define routes explicitly
app.get('/', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.home));
});

app.get('/docs', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.docs));
});

app.listen(3000);
```

**Security note:** Routes are defined explicitly, NOT generated from registry. This prevents unintended route exposure.

### Express Middleware (neulix/express)

The `staticAssets` middleware handles serving `dist/` and `public/` directories:

```typescript
import { staticAssets } from 'neulix/express';

// Basic usage
staticAssets(app);

// With options
staticAssets(app, {
  distPath: 'dist',           // Default: 'dist'
  publicPath: 'public',       // Default: 'public'
  hashedAssetMaxAge: '1y',    // Default: '1y' (production)
  publicAssetMaxAge: '1d',    // Default: '1d' (production)
});
```

**Caching behavior:**
| Environment | Directory | Cache Policy |
|-------------|-----------|--------------|
| Development | `dist/`, `public/` | No caching |
| Production | `dist/` | `max-age=1y, immutable` |
| Production | `public/` | `max-age=1d` |

---

## Styling System

### Tailwind CSS v4

Neulix uses Tailwind CSS v4 with the `@tailwindcss/cli` package.

**CSS entry file** (`src/styles/global.css`):
```css
@import "tailwindcss";
```

**Important:** Tailwind v4 uses `@import "tailwindcss"` instead of the v3 directives (`@tailwind base`, etc.).

### Build Process

The CLI automatically:
1. Scans `src/styles/*.css` for all CSS files
2. Processes each through `@tailwindcss/cli`
3. Outputs to `dist/` (e.g., `dist/global.css`)
4. In production, adds content hash (e.g., `dist/global-abc123.css`)

### Loading CSS in Pages

CSS files from `src/styles/` are automatically built and available at their filename in `dist/`. The `renderPage` function handles loading the appropriate CSS file based on the manifest.

---

## Props System

### Passing Props from Server to Client

```typescript
// server.ts
app.get('/user/:id', async (req, res) => {
  const user = await db.getUser(req.params.id);

  res.send(await renderPage(pages.user, {
    props: { user },
    title: user.name,
  }));
});

// pages/User.tsx
interface UserProps {
  user: { id: string; name: string };
}

export default function User({ user }: UserProps) {
  return <h1>Hello, {user.name}</h1>;
}
```

**Props flow:**
1. Server fetches data
2. `renderPage()` SSRs component with props
3. Props serialized to `<script id="__PROPS__" type="application/json">`
4. Client `hydrate()` reads and passes props to component

**SSR-only pages:** If `hydrate: false`, props are used for SSR but not serialized (no client to read them).

---

## Build Output

### Development

```
dist/
├── global.css            # Unhashed CSS
├── Home.client.js        # Unhashed entry bundles
├── About.client.js
└── chunk-*.js            # Shared chunks (React, etc.)
```

### Production

```
dist/
├── manifest.json         # Asset mapping for SSR
├── global-{hash}.css     # Content-hashed CSS
├── Home.client-{hash}.js # Content-hashed entries
├── About.client-{hash}.js
└── chunk-{hash}.js       # Content-hashed chunks
```

---

## File Watcher Behavior

The dev server watches `src/` and responds to changes:

| File Change | Action |
|-------------|--------|
| `*.css`, `*.tsx` | Rebuild Tailwind CSS |
| `*.client.tsx`, `client/*` | Rebuild client bundles |
| `server.ts`, `utils/*`, `api/*` | Restart server |
| `registry.ts` | Restart server + rebuild client |
| Page components (not `.client.tsx`) | Restart server |

Changes are debounced (100ms) to batch rapid saves.

---

## Error Boundary

Neulix includes a built-in ErrorBoundary component with inline styles (to avoid Tailwind dependency issues in node_modules):

```typescript
import { ErrorBoundary } from 'neulix';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

## Development Workflow

### Workspace Setup

This is a Bun monorepo using workspaces:

```json
// Root package.json
{
  "workspaces": ["packages/*", "apps/*"]
}
```

### Linking the CLI

Bun workspaces don't auto-link bin scripts. The root `package.json` includes a postinstall script:

```json
{
  "scripts": {
    "postinstall": "mkdir -p node_modules/.bin && ln -sf ../neulix/src/cli/index.ts node_modules/.bin/neulix && chmod +x node_modules/.bin/neulix"
  }
}
```

This allows `neulix dev` to work directly in scripts.

### Running the Example App

```bash
# From root
bun install
cd apps/example
bun run dev
```

### Testing create-neulix

```bash
bunx ./packages/create-neulix my-test-app
cd my-test-app
bun install
bun run dev
```

---

## Key Design Decisions

### 1. Explicit Routes (Security)
Routes are defined in `server.ts`, not derived from registry. This prevents registry manipulation from exposing unintended routes.

### 2. createPages() for Type Safety
Auto-injects `name` from object keys with full TypeScript support:
```typescript
pages.home    // Type: { component: typeof Home, hydrate: true, name: "home" }
pages.unknown // Type error: Property 'unknown' does not exist
```

### 3. Content-Hashed Filenames
Production assets use content hashes. Same content = same hash = browser cache hit. Enables aggressive caching.

### 4. Single CSS File
One Tailwind CSS file serves all pages. Cached on first visit, no additional downloads on navigation.

### 5. Express Middleware for Static Assets
The `staticAssets` middleware encapsulates all static file serving logic, making server files cleaner and ensuring consistent caching behavior.

### 6. Inline Styles for Library Components
Built-in components (like ErrorBoundary) use inline styles to avoid Tailwind dependency issues when the library is in node_modules.

---

## Recommended Tools

- **Biome** - Fast linter and formatter (optional but recommended)
- **TypeScript** - Type checking with `bun run type-check`

---

## Performance Characteristics

### First Page Load (Cold)
| Phase | Size | Blocking? |
|-------|------|-----------|
| HTML | ~5-10 KB | Yes |
| CSS | ~10-50 KB (purged) | Yes |
| JS (entry) | ~5-15 KB | No |
| JS (chunk) | ~40-60 KB (React) | No |

### SSR-Only Page
| Phase | Size | Blocking? |
|-------|------|-----------|
| HTML | ~5-10 KB | Yes |
| CSS | ~10-50 KB | Yes |
| JS | 0 KB | N/A |

Zero JavaScript execution for SSR-only pages.

---

## Adding a New Page

### Hydrated Page (with JavaScript)

1. Create `src/pages/NewPage.tsx`
2. Create `src/pages/NewPage.client.tsx`:
   ```typescript
   import { hydrate } from 'neulix/client';
   import NewPage from './NewPage';
   hydrate(NewPage);
   ```
3. Add to `src/pages/registry.ts`:
   ```typescript
   newpage: { component: NewPage, hydrate: true }
   ```
4. Add route in `src/server.ts`:
   ```typescript
   app.get('/new-page', async (req, res) => {
     res.send(await renderPage(pages.newpage, { title: 'New Page' }));
   });
   ```

### SSR-Only Page (zero JavaScript)

1. Create `src/pages/Static.tsx`
2. Add to registry with `hydrate: false`
3. Add route in server
4. **No `.client.tsx` file needed**

---

## Troubleshooting

### CSS Not Updating
- Check `src/styles/*.css` exists
- Hard refresh browser (Cmd+Shift+R)
- Check terminal for Tailwind errors

### JavaScript Not Loading
- Verify `hydrate: true` in registry
- Verify `.client.tsx` file exists and calls `hydrate()`
- Check browser Network tab for 404s

### Hydration Mismatch
- Avoid `Date`, `Math.random()` in components
- Use `useEffect` for browser-only code
- Ensure props match between server and client

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `react`, `react-dom` | UI library (peer dependency) |
| `express` | HTTP server (user-provided) |
| `@tailwindcss/cli` | CSS processing (dev dependency) |
| `typescript` | Type checking (dev dependency) |

No Webpack, Vite, or additional bundlers - Bun handles everything.
