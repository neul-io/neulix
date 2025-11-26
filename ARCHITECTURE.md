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
- **Server-side props** - Pass data to components with automatic client serialization
- **Dynamic titles** - Set page titles from server routes

---

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
│   │   ├── Home.client.tsx     #   Home page client entry (hydrated)
│   │   ├── Home.css            #   Home page styles (optional)
│   │   ├── About.tsx           #   About page React component
│   │   ├── About.client.tsx    #   About page client entry (hydrated)
│   │   ├── Docs.tsx            #   Docs page React component (SSR-only, no .client!)
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
│   ├── Home.client-[hash].js   #   Page client bundles
│   └── chunk-[hash].js         #   Shared chunks (React, etc.)
│
├── tailwind.config.ts          # Tailwind CSS config
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies and scripts
```

---

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

## Key Files - Detailed Breakdown

### src/types.ts

**Purpose**: Central TypeScript definitions for the entire application.

**Exports**:

| Interface | Description |
|-----------|-------------|
| `BuildManifest` | Maps entry names to their hashed JS/CSS files and chunk imports |
| `PageConfig<P>` | Page configuration with generic props type. Contains: `name`, `component`, `url`, `hydrate` |
| `RenderOptions<P>` | Options passed to `renderPage()`. Contains: `props?`, `title?` |

**Key Details**:
- `PageConfig.name` is auto-injected by `createPages()` helper - don't set manually
- `PageConfig.hydrate: boolean` controls whether page gets client-side JS
- `RenderOptions.props` is serialized to JSON for client hydration (only if `hydrate: true`)
- `RenderOptions.title` sets the `<title>` tag, defaults to "App"

---

### src/pages/registry.ts

**Purpose**: Central registry of all pages with TypeScript autocomplete support.

**Key Concepts**:

1. **`createPages()` helper**: A generic function that:
   - Takes an object where keys are page names (`home`, `about`, `docs`)
   - Auto-injects `name` property from each key
   - Preserves literal types for autocomplete (`pages.home` not `pages[string]`)
   - Runs once at module load (~0.001ms)

2. **Page configuration shape**:
   - `component`: The React component to render
   - `url`: The URL pattern (for documentation; routes defined in server.ts)
   - `hydrate`: `true` = needs `.client.tsx` file, `false` = SSR-only

**Naming Convention**:
- Entry key: lowercase (`home`, `about`, `docs`)
- Component file: PascalCase (`Home.tsx`, `About.tsx`)
- Client file: PascalCase + `.client.tsx` (`Home.client.tsx`)

**Example Structure**:
```
pages = {
  home:  { component: Home,  url: '/',      hydrate: true  },
  about: { component: About, url: '/about', hydrate: true  },
  docs:  { component: Docs,  url: '/docs',  hydrate: false },
}
```

After `createPages()`, each entry gains a `name` property matching its key.

---

### src/server.ts

**Purpose**: Express application with explicit route definitions.

**Key Sections**:

1. **Static asset serving**: Serves `dist/` and `public/` directories
2. **API mounting**: Mounts `/api` router from `src/api/`
3. **Page routes**: Explicitly defined routes calling `renderPage()`
4. **404 handler**: Catches unmatched routes

**Route Definition Pattern**:
```
app.get(url, handler) → res.send(renderPage(pages.xxx, options?))
```

**RenderOptions Usage**:

| Scenario | Call |
|----------|------|
| Static page, default title | `renderPage(pages.home)` |
| Static page, custom title | `renderPage(pages.home, { title: 'Home' })` |
| Dynamic page with data | `renderPage(pages.project, { props: { project }, title: project.name })` |

**Security Note**: Routes are explicitly defined, NOT iterated from registry. This prevents unintended route exposure.

---

### src/utils/ssr.ts

**Purpose**: Server-side rendering with asset resolution and props serialization.

**Main Export**: `renderPage<P>(page, options?)`

**Function Flow**:

1. Extract `props` and `title` from options
2. Render component to HTML string via `renderToString()`
3. Resolve asset tags based on environment:
   - **Dev**: Hardcoded paths (`/styles.css`, `/{Name}.client.js`)
   - **Prod**: Read from `manifest.json` for hashed filenames
4. Serialize props to JSON (only if `hydrate: true` AND props exist)
5. Generate full HTML document via `createHtmlTemplate()`

**Asset Resolution**:

| Environment | CSS | JS | Chunks |
|-------------|-----|----|----|
| Development | `/styles.css` | `/{Name}.client.js` | N/A |
| Production | From manifest | From manifest | Modulepreload hints |

**Props Serialization**:
- Props are JSON-stringified into `<script id="__PROPS__" type="application/json">`
- Only serialized when `page.hydrate === true` AND `props` is provided
- SSR-only pages never serialize props (no client to read them)

---

### src/utils/render.ts

**Purpose**: HTML template generation and manifest parsing.

**Exports**:

1. **`getPageAssetTags(manifest, entryName, hydrate)`**
   - Looks up entry in manifest
   - Returns `{ cssTags, preloadTags, scriptTags }`
   - If `hydrate: false`, returns only CSS tags

2. **`createHtmlTemplate(options)`**
   - Generates full HTML document
   - Accepts: `appHtml`, `scriptTags`, `cssTags`, `preloadTags`, `title`, `propsJson`

**HTML Structure Generated**:
```
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" ...>
    <title>{title}</title>
    {cssTags}
    {preloadTags}
  </head>
  <body>
    <div id="root">{appHtml}</div>
    {propsScript}     <!-- Only if propsJson provided -->
    {scriptTags}
  </body>
</html>
```

---

### src/client/hydrate.tsx

**Purpose**: Client-side hydration utility that reads server props.

**Main Export**: `hydrate<P>(Component)`

**Function Flow**:

1. Find `<script id="__PROPS__">` in DOM
2. Parse JSON content as props (or undefined if not found)
3. Call `hydrateRoot()` with component and props
4. Wrap in `StrictMode` for consistency with server

**Props Flow**:
```
Server: renderPage(page, { props })
  → JSON.stringify(props)
  → <script id="__PROPS__">

Client: hydrate(Component)
  → getElementById('__PROPS__')
  → JSON.parse()
  → hydrateRoot(root, <Component {...props} />)
```

---

### src/pages/*.client.tsx

**Purpose**: Client-side entry point for hydrated pages.

**Pattern**: Each hydrated page needs a `.client.tsx` file that:
1. Imports `hydrate` from `../client/hydrate`
2. Imports the page component
3. Calls `hydrate(Component)`

**File Naming**:
- Component: `Home.tsx`
- Client entry: `Home.client.tsx`
- Registry key: `home`

**SSR-only pages** (like `Docs.tsx`) do NOT need a `.client.tsx` file.

---

### src/build.ts

**Purpose**: Production build script that creates optimized, hashed assets.

**Build Steps**:

1. Clean `dist/` folder
2. Run Tailwind CLI with `--minify`
3. Hash CSS content → `styles-{hash}.css`
4. Collect entry points from registry (hydrated pages only)
5. Run `Bun.build()` with code splitting
6. Generate `manifest.json` mapping entry names to hashed files
7. Add SSR-only pages to manifest (CSS only, no JS)

**Bun.build() Configuration**:
- `splitting: true` - Extract shared code (React) into chunks
- `minify: true` - Minify output
- `naming: '[name]-[hash].[ext]'` - Content-hashed filenames
- `target: 'browser'` - Browser-compatible output
- `format: 'esm'` - ES modules

**Manifest Structure**:
```
{
  "home": {
    "js": "Home.client-abc123.js",
    "css": "styles-def456.css",
    "imports": ["chunk-xyz789.js"]
  },
  "docs": {
    "css": "styles-def456.css"
    // No "js" or "imports" - SSR only
  }
}
```

---

### src/dev.ts

**Purpose**: Development environment with file watching and hot rebuilds.

**Capabilities**:

| File Change | Action |
|-------------|--------|
| `*.css`, `*.tsx` | Rebuild Tailwind CSS |
| `*.client.tsx`, `client/*` | Rebuild client bundles |
| `server.ts`, `utils/*`, `api/*` | Restart server |
| `registry.ts` | Restart server + rebuild client |
| Page components (not `.client.tsx`) | Restart server |

**Development Bun.build() Configuration**:
- `splitting: true` - Same as production
- `minify: false` - Readable output
- `naming: '[name].js'` - No hashes (not needed in dev)
- `sourcemap: 'inline'` - Debugging support

---

## Build Output

### Development (dist/)
```
dist/
├── styles.css              # Unhashed
├── Home.client.js          # Unhashed
├── About.client.js         # Unhashed
└── chunk-*.js              # Shared chunks (unhashed)
```

### Production (dist/)
```
dist/
├── manifest.json           # Asset mapping
├── styles-{hash}.css       # Content-hashed CSS
├── Home.client-{hash}.js   # Content-hashed entry
├── About.client-{hash}.js  # Content-hashed entry
└── chunk-{hash}.js         # Content-hashed shared chunk
```

---

## Data Flow

### Hydrated Page Request (Production)

```
Browser: GET /
    ↓
Express: app.get('/') → renderPage(pages.home, { title: 'Home' })
    ↓
ssr.ts: renderToString(createElement(Home, props))
    ↓
render.ts: getPageAssetTags(manifest, 'home', true)
    ↓
HTML returned:
  <title>Home</title>
  <link href="/styles-{hash}.css">
  <link rel="modulepreload" href="/chunk-{hash}.js">
  <div id="root">{SSR HTML}</div>
  <script id="__PROPS__">{serialized props}</script>
  <script src="/Home.client-{hash}.js">
    ↓
Browser: Load CSS, preload chunk, execute entry
    ↓
Home.client.tsx: hydrate(Home)
    ↓
hydrate.tsx: Parse __PROPS__, hydrateRoot(root, <Home {...props} />)
```

### SSR-Only Page Request (Production)

```
Browser: GET /docs
    ↓
Express: app.get('/docs') → renderPage(pages.docs, { title: 'Documentation' })
    ↓
ssr.ts: renderToString(createElement(Docs))
    ↓
render.ts: getPageAssetTags(manifest, 'docs', false)
    ↓
HTML returned:
  <title>Documentation</title>
  <link href="/styles-{hash}.css">
  <div id="root">{SSR HTML}</div>
  NO <script> tags
    ↓
Browser: Render static HTML + cached CSS
    ↓
ZERO JavaScript executed
```

---

## Adding a New Page

### Hydrated Page (with JavaScript)

**Files to create/modify**:

1. `src/pages/NewPage.tsx` - React component (receives props if needed)
2. `src/pages/NewPage.client.tsx` - Client entry calling `hydrate(NewPage)`
3. `src/pages/registry.ts` - Add entry with `hydrate: true`
4. `src/server.ts` - Add explicit route

**Registry entry pattern**:
```
newpage: {
  component: NewPage,
  url: '/new-page',
  hydrate: true,
}
```

**Route pattern**:
```
app.get('/new-page', (req, res) => {
  res.send(renderPage(pages.newpage, { title: 'New Page' }));
});
```

### SSR-Only Page (zero JavaScript)

**Files to create/modify**:

1. `src/pages/Static.tsx` - React component
2. `src/pages/registry.ts` - Add entry with `hydrate: false`
3. `src/server.ts` - Add explicit route

**NO `.client.tsx` file needed.**

### Dynamic Page (with server-side data)

**Files to create/modify**:

1. `src/pages/Project.tsx` - React component with typed props interface
2. `src/pages/Project.client.tsx` - Client entry
3. `src/pages/registry.ts` - Add entry
4. `src/server.ts` - Add route with data fetching

**Component pattern**:
```
interface ProjectProps {
  project: { id: string; name: string };
}

export default function Project({ project }: ProjectProps) { ... }
```

**Route pattern**:
```
app.get('/project/:id', async (req, res) => {
  const project = await db.getProject(req.params.id);
  res.send(renderPage(pages.project, {
    props: { project },
    title: project.name,
  }));
});
```

**Props lifecycle**:
1. Server fetches data
2. `renderPage()` passes props to component for SSR
3. Props serialized to `<script id="__PROPS__">`
4. Client `hydrate()` reads and passes props to component

---

## Key Design Decisions

### 1. Explicit Routes (Security)

Routes are defined explicitly in `server.ts`, NOT iterated from registry. This prevents potential security issues where registry manipulation could expose unintended routes.

### 2. createPages() Helper for Type Safety

Auto-injects `name` from object keys and preserves literal types. Benefits:
- **No duplication**: Key is the name
- **Full autocomplete**: `pages.home`, `pages.about`, etc.
- **Zero runtime cost**: Runs once at startup

### 3. Content-Hashed Filenames (Production)

All production assets have content hashes. When content changes, filename changes, forcing browser to fetch new version. Enables aggressive caching (`Cache-Control: max-age=31536000`).

### 4. Single CSS File

One Tailwind CSS file serves all pages. Trade-off:
- **Pro**: Cached on first visit, no additional downloads
- **Con**: First load includes all classes (mitigated by Tailwind's purging)

### 5. Shared Chunk for React

Bun's code splitting extracts React and shared code. Users download React once, cached for all pages.

### 6. Props Serialization Pattern

Server props are JSON-serialized into a `<script type="application/json">` tag:
- Safe from XSS (not executed as JS)
- Parsed by client hydration utility
- Only included when `hydrate: true` AND props provided

### 7. renderToString (Synchronous SSR)

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

| Package | Purpose |
|---------|---------|
| `express` | HTTP server and routing |
| `react` | UI library |
| `react-dom` | React DOM rendering (server + client) |
| `tailwindcss` | CSS framework (dev dependency) |
| `typescript` | Type checking (dev dependency) |

No Vite, Webpack, or other bundlers needed - Bun handles everything.
