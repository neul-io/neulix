# MPA with React SSR, Bun Bundler, and Selective Hydration

This document provides a comprehensive technical breakdown for implementing this architecture.

---

For project philosophy, design principles, and quick start instructions, see [README.md](./README.md).

---

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
├── config/                     # Build and dev scripts
│   ├── dev.ts                  #   Development watcher (Bun + Tailwind)
│   └── build.ts                #   Production build script
│
├── public/                     # Static assets (served as-is)
│   └── favicon.svg
│
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
| `config/` | Build | Development and production build scripts |
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
| `PageConfig<P>` | Page configuration with generic props type. Contains: `name`, `component`, `hydrate` |
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
   - `hydrate`: `true` = needs `.client.tsx` file, `false` = SSR-only

**Naming Convention**:
- Entry key: lowercase (`home`, `about`, `docs`)
- Component file: PascalCase (`Home.tsx`, `About.tsx`)
- Client file: PascalCase + `.client.tsx` (`Home.client.tsx`)

**Example Structure**:
```
pages = {
  home:  { component: Home,  hydrate: true  },
  about: { component: About, hydrate: true  },
  docs:  { component: Docs,  hydrate: false },
}
```

After `createPages()`, each entry gains a `name` property matching its key.

---

### src/server.ts

**Purpose**: Express application with explicit route definitions.

**Key Sections**:

1. **Static asset serving**: Serves `dist/` and `public/` directories with cache headers
2. **API mounting**: Mounts `/api` router from `src/api/`
3. **Page routes**: Explicitly defined routes calling `renderPage()`
4. **404 handler**: Catches unmatched routes

**Static Asset Caching**:

| Environment | Directory | Cache Policy |
|-------------|-----------|--------------|
| Development | `dist/`, `public/` | No caching (fresh on every request) |
| Production | `dist/` | `max-age=1y, immutable` (hashed filenames) |
| Production | `public/` | `max-age=1d` (non-hashed assets) |

**Why Aggressive Caching?**
- Production assets use content hashes (`styles-abc123.css`, `Home.client-def456.js`)
- When content changes, the hash changes, so browsers fetch the new file
- Old hashed files can be cached forever since they'll never be requested again
- The `immutable` directive tells browsers not to revalidate

```typescript
// Production caching example
app.use(express.static('dist', { maxAge: '1y', immutable: true }));
app.use(express.static('public', { maxAge: '1d' }));
```

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

### config/build.ts

**Purpose**: Production build script that creates optimized, hashed assets.

**Build Steps**:

1. Clean `dist/` folder
2. Run Tailwind CLI with `--minify`
3. Hash CSS content → `styles-{hash}.css`
4. Collect entry points from registry (hydrated pages only) using glob patterns
5. Run `Bun.build()` with code splitting
6. Generate `manifest.json` mapping entry names to hashed files
7. Add SSR-only pages to manifest (CSS only, no JS)

**Dynamic Entry Point Resolution**:

Instead of hardcoding paths, the build script uses Bun's `Glob` class to find client entries anywhere in the pages directory:

```typescript
import { Glob } from 'bun';

// Finds Home.client.tsx anywhere under src/pages/
// e.g., src/pages/Home.client.tsx OR src/pages/marketing/Home.client.tsx
async function findClientEntry(entryName: string): Promise<string | null> {
  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);
  const pattern = `src/pages/**/${capitalizedEntry}.client.tsx`;
  const glob = new Glob(pattern);

  for await (const file of glob.scan('.')) {
    return resolve(process.cwd(), file);
  }
  return null;
}
```

**Why Glob Patterns?**
- **Flexible folder structure**: Organize pages into subfolders without updating build config
- **Convention-based**: Just follow the naming convention (`{Name}.client.tsx`)
- **Zero configuration**: New pages are automatically discovered

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

### config/dev.ts

**Purpose**: Development environment with file watching and hot rebuilds.

**Capabilities**:

| File Change | Action |
|-------------|--------|
| `*.css`, `*.tsx` | Rebuild Tailwind CSS |
| `*.client.tsx`, `client/*` | Rebuild client bundles |
| `server.ts`, `utils/*`, `api/*` | Restart server |
| `registry.ts` | Restart server + rebuild client |
| Page components (not `.client.tsx`) | Restart server |

**Dynamic Entry Point Resolution**:

Uses the same glob-based discovery as `config/build.ts` (see above). Client entries are found automatically using the pattern `src/pages/**/${Name}.client.tsx`.

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
| `dev` | `bun run config/dev.ts` | Start dev server with file watching |
| `build` | `bun run config/build.ts` | Production build |
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

---

## Deep Dive: TypeScript Generic System

### PageConfig Generic Parameter

The `PageConfig<P>` interface uses a generic type `P` to represent the props type for each page component. This enables end-to-end type safety from server routes to client hydration.

**Type Definition Breakdown**:

```
PageConfig<P = unknown>
  ├── name: string           # Auto-injected by createPages()
  ├── component: React.ComponentType<P>   # Component that accepts P
  └── hydrate: boolean       # Whether to include client JS
```

**Generic Flow**:

1. Page component defines its props interface
2. Registry entry infers `P` from the component
3. `renderPage()` enforces correct props type
4. Compiler catches mismatched props at build time

**Example Type Flow**:

```
// 1. Component defines props
interface UserProps { user: { id: string; name: string } }
function UserPage({ user }: UserProps) { ... }

// 2. Registry entry - P is inferred as UserProps
userpage: { component: UserPage, hydrate: true }

// 3. renderPage() - TypeScript enforces UserProps
renderPage(pages.userpage, { props: { user: {...} } })  // ✓ Valid
renderPage(pages.userpage, { props: { wrong: 123 } })   // ✗ Type error
```

### createPages() Type Preservation

The `createPages()` helper uses TypeScript's mapped types to preserve literal key types:

```
function createPages<T extends Record<string, PageInput>>(input: T)
  : { [K in keyof T]: T[K] & { name: K } }
```

**Type Breakdown**:

| Part | Purpose |
|------|---------|
| `<T extends Record<string, PageInput>>` | Accept object with string keys, PageInput values |
| `[K in keyof T]` | Iterate over each key in input |
| `T[K] & { name: K }` | Merge original config with `name` property |

**Why This Matters**:

Without type preservation:
```
pages.home    // Type: PageConfig (no autocomplete)
pages.unknown // Type: PageConfig (no error!)
```

With type preservation:
```
pages.home    // Type: { component: typeof Home, hydrate: true, name: "home" }
pages.unknown // Type error: Property 'unknown' does not exist
```

### RenderOptions Generic Constraint

The `renderPage()` function uses a constrained generic:

```
function renderPage<P extends Record<string, unknown> = Record<string, never>>(
  page: PageConfig<P>,
  options: RenderOptions<P> = {}
): string
```

**Constraint Breakdown**:

| Part | Purpose |
|------|---------|
| `P extends Record<string, unknown>` | Props must be an object (JSON-serializable) |
| `= Record<string, never>` | Default to empty object (pages without props) |
| `PageConfig<P>` | Page's component must accept these props |
| `RenderOptions<P>` | Options.props must match page's expected props |

**Why `Record<string, never>` Default**:

- `never` means "no valid values" for object properties
- An empty `{}` satisfies `Record<string, never>`
- Prevents accidentally passing props to pages that don't expect them

---

## Deep Dive: Hydration Mechanics

### What is Hydration?

Hydration is the process of attaching React's event handlers and state management to server-rendered HTML. The server sends static HTML, and the client "hydrates" it with interactivity.

**Without Hydration (SSR-only)**:
```
Server renders HTML → Browser displays static page → No JS runs
```

**With Hydration**:
```
Server renders HTML → Browser displays static page → JS loads → React attaches → Page becomes interactive
```

### hydrateRoot vs createRoot

| Method | Purpose | When to Use |
|--------|---------|-------------|
| `createRoot()` | Client-side rendering from scratch | SPAs, no SSR |
| `hydrateRoot()` | Attach to existing server HTML | SSR applications |

**Critical Difference**:

`createRoot()` replaces innerHTML entirely. `hydrateRoot()` preserves existing DOM and only attaches event listeners.

If you use `createRoot()` with SSR:
1. User sees server HTML briefly
2. React replaces entire DOM
3. Visual flash/flicker occurs
4. SEO benefits lost (content re-renders)

### Hydration Mismatch Errors

React compares server HTML with client render. Mismatches cause warnings or errors.

**Common Causes**:

| Cause | Example | Solution |
|-------|---------|----------|
| Date/time rendering | `new Date().toLocaleString()` | Use consistent format or suppress hydration |
| Random values | `Math.random()` | Generate server-side, pass as prop |
| Browser-only APIs | `window.innerWidth` | Use `useEffect` for client-only code |
| Different props | Server/client have different data | Ensure props match via `__PROPS__` |

**How This Architecture Avoids Mismatches**:

1. Same props on server and client via `__PROPS__` script
2. Same `StrictMode` wrapping on both sides
3. Same component code (single source of truth)

### StrictMode on Both Sides

Both server and client wrap components in `StrictMode`:

**Server** (ssr.ts):
```
createElement(StrictMode, null, createElement(page.component, props))
```

**Client** (hydrate.tsx):
```
<StrictMode><Component {...props} /></StrictMode>
```

**Why Both Sides Need It**:

- Ensures identical component tree structure
- StrictMode adds wrapper element to React tree
- Mismatch would cause hydration error

---

## Deep Dive: Asset Loading Strategy

### CSS Loading

CSS is loaded via `<link rel="stylesheet">` in the `<head>`:

```
<head>
  <link rel="stylesheet" href="/styles-abc123.css">
</head>
```

**Loading Behavior**:

1. Browser parses HTML
2. Encounters `<link>` in `<head>`
3. Pauses HTML parsing (render-blocking)
4. Downloads and parses CSS
5. Continues HTML parsing
6. First paint occurs with styles applied

**Why Render-Blocking is OK**:

- Prevents Flash of Unstyled Content (FOUC)
- CSS is typically small (Tailwind purges unused)
- Single file means single request
- Cached after first page load

### JavaScript Loading

Scripts use `type="module"` and appear at end of `<body>`:

```
<body>
  <div id="root">...</div>
  <script type="module" src="/Home.client-xyz789.js"></script>
</body>
```

**Loading Behavior**:

1. Browser parses HTML
2. Renders visible content (user sees page)
3. Encounters `<script type="module">`
4. Fetches script (non-blocking)
5. Executes after DOM ready
6. Hydration occurs

**Why End of Body**:

- HTML fully parsed before script runs
- User sees content immediately
- `type="module"` is automatically deferred
- No need for `DOMContentLoaded` listener

### Modulepreload for Chunks

Production builds add preload hints for shared chunks:

```
<head>
  <link rel="stylesheet" href="/styles-abc123.css">
  <link rel="modulepreload" href="/chunk-xyz789.js">
</head>
```

**What `modulepreload` Does**:

1. Browser sees hint in `<head>`
2. Starts downloading chunk immediately
3. Parses module (but doesn't execute)
4. When entry script imports chunk, it's ready

**Performance Impact**:

Without preload:
```
Load entry.js → Parse → See import → Load chunk.js → Parse → Execute
              ↑ Network waterfall here
```

With preload:
```
Load entry.js ────────→ Parse → Execute
Load chunk.js (parallel) → Parse → Ready
```

### Cache Headers Strategy

**Development**:
- No caching (files change constantly)
- Express serves files without cache headers

**Production**:
- Content-hashed filenames enable aggressive caching
- Recommended header: `Cache-Control: public, max-age=31536000, immutable`
- `immutable` tells browser: never revalidate, hash changes = new file

**Implementation** (add to server.ts for production):

```
app.use('/dist', express.static('dist', {
  maxAge: '1y',
  immutable: true
}));
```

---

## Deep Dive: Build Process

### Production Build Steps (Detailed)

**Step 1: Clean dist/**

```
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })
```

Removes all previous build artifacts. Prevents stale files from persisting.

**Step 2: Tailwind CSS Build**

```
bunx tailwindcss -i src/styles/input.css -o dist/styles.css --minify
```

| Flag | Purpose |
|------|---------|
| `-i` | Input file with `@tailwind` directives |
| `-o` | Output destination |
| `--minify` | Remove whitespace, shorten names |

Tailwind scans all files in `content` config, extracts used classes, generates minimal CSS.

**Step 3: CSS Hashing**

```
const cssContent = await Bun.file('dist/styles.css').text();
const cssHash = Bun.hash(cssContent).toString(16).slice(0, 8);
const cssFileName = `styles-${cssHash}.css`;
```

Hash is derived from file content, not timestamp. Same content = same hash = browser cache hit.

**Step 4: Collect Entry Points**

```
for (const [entryName, config] of Object.entries(pages)) {
  if (config.hydrate) {
    entrypoints.push(`src/pages/${Name}.client.tsx`);
  }
}
```

Only hydrated pages need client bundles. SSR-only pages are skipped.

**Step 5: Bun.build()**

```
Bun.build({
  entrypoints,           // Array of .client.tsx files
  outdir: 'dist',
  naming: '[name]-[hash].[ext]',
  splitting: true,
  minify: true,
  target: 'browser',
  format: 'esm',
})
```

| Option | Value | Effect |
|--------|-------|--------|
| `splitting` | `true` | Extract shared code into chunks |
| `minify` | `true` | Reduce file size |
| `naming` | `[name]-[hash].[ext]` | Content-based hashing |
| `target` | `browser` | Browser-compatible output |
| `format` | `esm` | ES modules (import/export) |

**Step 6: Generate Manifest**

Build output is analyzed to create mapping:

```
{
  "home": {
    "js": "Home.client-a1b2c3.js",
    "css": "styles-d4e5f6.css",
    "imports": ["chunk-g7h8i9.js"]
  }
}
```

Server reads this at startup to resolve asset URLs.

**Step 7: Add SSR-Only Entries**

Pages with `hydrate: false` still need CSS reference:

```
for (const [entryName, config] of Object.entries(pages)) {
  if (!config.hydrate) {
    manifest[entryName] = { css: cssFileName };
  }
}
```

### Development Build Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| CSS hashing | No | Yes |
| JS hashing | No | Yes |
| Minification | No | Yes |
| Sourcemaps | Inline | None |
| File watching | Yes | No |
| Server restart | Auto | Manual |

---

## Deep Dive: Server Architecture

### Express Application Structure

The server follows a layered architecture:

```
Request
  ↓
Static Middleware (dist/, public/)
  ↓
API Router (/api/*)
  ↓
Page Routes (/, /about, /docs, etc.)
  ↓
404 Handler
  ↓
Response
```

### Static Asset Serving

```
app.use(express.static('dist'));
app.use(express.static('public'));
```

**Order Matters**:

1. `dist/` checked first (build output)
2. `public/` checked second (static assets)
3. If no match, continues to next middleware

**What Gets Served**:

| Request | Served From |
|---------|-------------|
| `/styles-abc123.css` | dist/styles-abc123.css |
| `/Home.client-xyz.js` | dist/Home.client-xyz.js |
| `/favicon.svg` | public/favicon.svg |
| `/images/logo.png` | public/images/logo.png |

### API Router Pattern

```
// src/api/index.ts
const router = Router();
router.use('/hello', helloRouter);
export default router;

// src/server.ts
app.use('/api', apiRouter);
```

**Benefits**:

- API endpoints isolated from page routes
- Easy to add authentication middleware
- Clear separation of concerns

### Page Route Definition

Each page has an explicit route:

```
app.get('/', (req, res) => {
  res.send(renderPage(pages.home, { title: 'Home' }));
});

app.get('/about', (req, res) => {
  res.send(renderPage(pages.about, { title: 'About' }));
});
```

**Why Not Iterate**:

```
// DON'T DO THIS:
Object.values(pages).forEach(page => {
  app.get(page.url, ...);  // Security risk!
});
```

Iteration would expose any page added to registry, even internal/admin pages.

### Dynamic Routes with Parameters

```
app.get('/user/:id', async (req, res) => {
  const user = await db.getUser(req.params.id);

  if (!user) {
    return res.status(404).send(renderPage(pages.notfound));
  }

  res.send(renderPage(pages.user, {
    props: { user },
    title: user.name
  }));
});
```

**Data Fetching Pattern**:

1. Extract params from `req.params`
2. Fetch data (database, API, etc.)
3. Handle not found case
4. Pass data as props to `renderPage()`

### Error Handling

```
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(renderPage(pages.error, {
    props: { message: 'Something went wrong' }
  }));
});
```

**Error Page Pattern**:

- Create `Error.tsx` component with error props
- Add to registry with `hydrate: false` (no JS needed)
- Catch-all error handler renders it

---

## Deep Dive: Component Patterns

### Page Component Structure

**Hydrated Page** (with interactivity):

```
// src/pages/Counter.tsx
interface CounterProps {
  initialCount: number;
}

export default function Counter({ initialCount }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
```

**SSR-Only Page** (static content):

```
// src/pages/Privacy.tsx
export default function Privacy() {
  return (
    <article>
      <h1>Privacy Policy</h1>
      <p>Last updated: January 2025</p>
      {/* Static content, no interactivity needed */}
    </article>
  );
}
```

### Props Interface Patterns

**Simple Props**:

```
interface PageProps {
  title: string;
  description: string;
}
```

**Nested Object Props**:

```
interface UserPageProps {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string;
  };
}
```

**Array Props**:

```
interface ListPageProps {
  items: Array<{
    id: string;
    title: string;
    createdAt: string;  // ISO date string, not Date object
  }>;
}
```

**Optional Props**:

```
interface SearchPageProps {
  query?: string;
  results?: Array<{ id: string; title: string }>;
}
```

### Client Entry File Pattern

Every hydrated page needs a `.client.tsx` file:

```
// src/pages/Counter.client.tsx
import { hydrate } from '../client/hydrate';
import Counter from './Counter';

hydrate(Counter);
```

**That's It**. Three lines:

1. Import hydrate utility
2. Import page component
3. Call hydrate with component

### Shared Components

Components used across multiple pages go in `src/components/`:

```
project/
└── src/
    ├── components/
    │   ├── Header.tsx
    │   ├── Footer.tsx
    │   ├── Button.tsx
    │   └── Card.tsx
    └── pages/
        └── ...
```

**Import Pattern**:

```
// src/pages/Home.tsx
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main>...</main>
      <Footer />
    </>
  );
}
```

Shared components are bundled into chunks by Bun's code splitting.

---

## Deep Dive: CSS Architecture

### Tailwind Configuration

```
// tailwind.config.ts
export default {
  content: ['./src/**/*.{tsx,ts}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Content Glob Explanation**:

| Pattern | Matches |
|---------|---------|
| `./src/**/*.tsx` | All TSX files in src and subdirectories |
| `./src/**/*.ts` | All TS files (for dynamic class generation) |

Tailwind scans these files for class names to include in output.

### Input CSS Structure

```
/* src/styles/input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom global styles below */
```

| Directive | Purpose |
|-----------|---------|
| `@tailwind base` | Normalize/reset styles |
| `@tailwind components` | Component classes (if any) |
| `@tailwind utilities` | Utility classes (main Tailwind output) |

### Per-Page CSS Files

Optional CSS files can be created per page:

```
src/pages/
├── Home.tsx
├── Home.client.tsx
└── Home.css        # Optional page-specific styles
```

**Import in Component**:

```
// src/pages/Home.tsx
import './Home.css';

export default function Home() { ... }
```

Tailwind CLI scans these files and includes any classes used.

### CSS Class Patterns

**Layout**:
```
<div className="min-h-screen flex flex-col">
  <header className="h-16 border-b" />
  <main className="flex-1 container mx-auto px-4 py-8" />
  <footer className="h-16 border-t" />
</div>
```

**Responsive**:
```
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Interactive (requires hydration)**:
```
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700">
```

**Dark Mode** (if configured):
```
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
```

---

## Deep Dive: Development Workflow

### File Watcher Logic

The dev script watches `src/` recursively and reacts based on file type:

**CSS/TSX Changes → Rebuild CSS**:
```
if (filename.endsWith('.css') || filename.endsWith('.tsx')) {
  scheduleCssRebuild();
}
```

Why TSX triggers CSS rebuild: Tailwind scans TSX for class names.

**Server File Changes → Restart Server**:
```
if (filename.endsWith('server.ts') ||
    filename.includes('utils/') ||
    filename.includes('api/')) {
  restartServer();
}
```

Changes to server code require process restart to take effect.

**Client File Changes → Rebuild Bundles**:
```
if (filename.endsWith('.client.tsx') || filename.includes('client/')) {
  scheduleClientRebuild();
}
```

Client bundles need rebuilding when client code changes.

**Registry Changes → Both**:
```
if (filename.includes('registry.ts')) {
  restartServer();
  scheduleClientRebuild();
}
```

Registry affects both server (renderPage) and client (entry points).

### Debouncing

Multiple rapid file changes (e.g., save all) are debounced:

```
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
```

**Why 100ms**:

- Fast enough to feel instant
- Slow enough to batch multiple saves
- Prevents redundant rebuilds

### Server Process Management

```
let serverProcess: Subprocess | null = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill();
  }

  serverProcess = spawn({
    cmd: ['bun', 'run', 'src/server.ts'],
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
}
```

**Process Lifecycle**:

1. Kill existing process (if any)
2. Spawn new Bun process
3. Inherit stdout/stderr (logs visible in terminal)
4. Set NODE_ENV to development

### Graceful Shutdown

```
process.on('SIGINT', () => {
  if (serverProcess) serverProcess.kill();
  watcher.close();
  process.exit(0);
});
```

Ctrl+C in terminal:
1. Kills child server process
2. Closes file watcher
3. Exits cleanly

---

## Performance Characteristics

### First Page Load (Cold)

| Phase | What Loads | Blocking? |
|-------|------------|-----------|
| HTML | ~5-10 KB | Yes |
| CSS | ~10-50 KB (purged) | Yes |
| JS (entry) | ~5-15 KB | No |
| JS (chunk) | ~40-60 KB (React) | No |

**Total**: ~60-135 KB (varies by page complexity)

### Subsequent Page Load (Same Site)

| Phase | What Loads | From Cache? |
|-------|------------|-------------|
| HTML | ~5-10 KB | No (dynamic) |
| CSS | 0 KB | Yes |
| JS (chunk) | 0 KB | Yes |
| JS (entry) | ~5-15 KB | Maybe |

Shared assets cached, only page-specific content loads.

### SSR-Only Page Load

| Phase | What Loads | Blocking? |
|-------|------------|-----------|
| HTML | ~5-10 KB | Yes |
| CSS | ~10-50 KB | Yes |
| JS | 0 KB | N/A |

**Total**: ~15-60 KB, zero JavaScript execution.

### Time to Interactive (TTI)

**Hydrated Page**:
```
HTML parsed → CSS loaded → First paint → JS loaded → Hydration → Interactive
             [~50ms]      [~100ms]      [~200ms]    [~50ms]
```

**SSR-Only Page**:
```
HTML parsed → CSS loaded → First paint → Interactive (immediately)
             [~50ms]      [~100ms]
```

SSR-only pages are interactive immediately (no JS to wait for).

---

## Security Considerations

### XSS Prevention in Props

Props are serialized into `<script type="application/json">`:

```
<script id="__PROPS__" type="application/json">{"user":{"name":"<script>alert('xss')</script>"}}</script>
```

**Why This is Safe**:

1. `type="application/json"` prevents execution
2. Browser treats content as data, not code
3. `JSON.parse()` safely handles escaped characters

**What Would Be Unsafe**:

```
<!-- DON'T DO THIS -->
<script>window.__PROPS__ = {"user":{"name":"<script>alert('xss')</script>"}}</script>
```

This would execute the injected script.

### Route Exposure Prevention

Routes are explicit, not generated from registry:

```
// Safe: Explicit routes
app.get('/', ...);
app.get('/about', ...);

// Unsafe: Generated routes
pages.forEach(p => app.get(p.url, ...));  // Could expose admin pages!
```

### Static File Restrictions

Express static middleware only serves files in `dist/` and `public/`:

```
app.use(express.static('dist'));
app.use(express.static('public'));
```

**Cannot Access**:
- `src/` (source code)
- `config/` (build scripts)
- `node_modules/`
- `package.json`
- `.env` files

### Environment Variables

Server-side code can access `process.env`:

```
// src/server.ts - OK
const apiKey = process.env.API_KEY;
```

Client-side code cannot:

```
// src/pages/Home.tsx - DON'T DO THIS
const apiKey = process.env.API_KEY;  // undefined in browser!
```

**Safe Pattern**: Pass non-sensitive config as props:

```
// server.ts
renderPage(pages.home, {
  props: { apiUrl: process.env.PUBLIC_API_URL }
});
```

---

## Troubleshooting Guide

### Hydration Mismatch Errors

**Symptom**: Console warning about server/client mismatch

**Common Causes**:

| Cause | Solution |
|-------|----------|
| Date rendering | Format dates consistently or use `suppressHydrationWarning` |
| `Math.random()` | Generate server-side, pass as prop |
| `typeof window` check | Use `useEffect` for client-only code |
| Different prop values | Ensure `__PROPS__` matches server render |

**Debug Steps**:

1. Check browser console for specific mismatch details
2. Compare server HTML (view source) with client render
3. Look for dynamic values in component

### CSS Not Updating

**Symptom**: Changes to Tailwind classes not appearing

**Possible Causes**:

| Cause | Solution |
|-------|----------|
| Class not in content glob | Add file path to `tailwind.config.ts` |
| Browser cache | Hard refresh (Cmd+Shift+R) |
| Dev server not rebuilding | Check terminal for errors |
| Dynamic class names | Use complete class strings, not interpolation |

**Dynamic Class Problem**:

```
// Won't work - Tailwind can't see the class
const color = 'blue';
<div className={`bg-${color}-500`} />

// Works - complete class string
const bgColor = isActive ? 'bg-blue-500' : 'bg-gray-500';
<div className={bgColor} />
```

### JavaScript Not Loading

**Symptom**: Page renders but isn't interactive

**Checklist**:

1. Is `hydrate: true` in registry?
2. Does `.client.tsx` file exist?
3. Does `.client.tsx` call `hydrate(Component)`?
4. Check browser Network tab for 404s
5. Check browser Console for errors

### Build Fails

**Symptom**: `bun run build` exits with error

**Common Errors**:

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot find module" | Missing import | Check import paths |
| "Type error" | TypeScript issue | Run `bun run type-check` |
| "Tailwind error" | Invalid CSS | Check `input.css` syntax |
| "Entry point not found" | Missing `.client.tsx` | Create file or set `hydrate: false` |

### Server Won't Start

**Symptom**: `bun run dev` or `bun run start` fails

**Checklist**:

1. Port already in use? Check for running processes
2. Missing dependencies? Run `bun install`
3. TypeScript errors? Run `bun run type-check`
4. Check `src/server.ts` for syntax errors

---

## Migration Guide

### Adding Hydration to SSR-Only Page

1. Create `.client.tsx` file:
   ```
   // src/pages/Docs.client.tsx
   import { hydrate } from '../client/hydrate';
   import Docs from './Docs';
   hydrate(Docs);
   ```

2. Update registry:
   ```
   docs: {
     component: Docs,
     hydrate: true,  // Changed from false
   }
   ```

3. Rebuild: `bun run build`

### Removing Hydration (Make SSR-Only)

1. Delete `.client.tsx` file

2. Update registry:
   ```
   docs: {
     component: Docs,
     hydrate: false,  // Changed from true
   }
   ```

3. Remove any client-side hooks from component:
   ```
   // Remove these from SSR-only pages:
   useState, useEffect, useRef, event handlers
   ```

4. Rebuild: `bun run build`

### Adding Props to Existing Page

1. Define props interface in component:
   ```
   interface DocsProps {
     version: string;
     lastUpdated: string;
   }

   export default function Docs({ version, lastUpdated }: DocsProps) {
     ...
   }
   ```

2. Update server route:
   ```
   app.get('/docs', (req, res) => {
     res.send(renderPage(pages.docs, {
       props: { version: '1.0.0', lastUpdated: '2025-01-15' },
       title: 'Documentation'
     }));
   });
   ```

3. If hydrated, props automatically available on client

### Renaming a Page

1. Rename component file: `Home.tsx` → `Landing.tsx`

2. Rename client file: `Home.client.tsx` → `Landing.client.tsx`

3. Update client file imports:
   ```
   import Landing from './Landing';
   hydrate(Landing);
   ```

4. Update registry:
   ```
   landing: {  // Changed key
     component: Landing,  // Changed import
     hydrate: true,
   }
   ```

5. Update server route:
   ```
   app.get('/', (req, res) => {
     res.send(renderPage(pages.landing, { title: 'Home' }));
   });
   ```

6. Update imports in registry.ts

---

## Comparison with Other Architectures

### vs Next.js

| Aspect | This Architecture | Next.js |
|--------|-------------------|---------|
| Framework | Express + React | Full framework |
| Routing | Explicit in server.ts | File-based |
| Bundler | Bun.build() | Webpack/Turbopack |
| Hydration | Per-page opt-in | Automatic |
| Data fetching | In route handlers | getServerSideProps, etc. |
| Learning curve | Lower | Higher |
| Features | Minimal | Extensive |

**When to Choose This**:
- Want explicit control over routing
- Don't need Next.js features (ISR, image optimization, etc.)
- Prefer minimal dependencies
- Building simple MPA

**When to Choose Next.js**:
- Need advanced features
- Want file-based routing
- Need incremental static regeneration
- Building complex application

### vs Remix

| Aspect | This Architecture | Remix |
|--------|-------------------|-------|
| Data loading | In route handlers | Loader functions |
| Forms | Standard HTML + JS | Progressive enhancement |
| Error handling | Manual | Built-in boundaries |
| Nested routes | No | Yes |
| Streaming | No (renderToString) | Yes |

### vs Traditional SPA

| Aspect | This Architecture | SPA (Vite + React) |
|--------|-------------------|--------------------|
| Initial load | HTML + CSS first | Blank → JS → Render |
| SEO | Excellent | Poor (without SSR) |
| Time to first paint | Fast | Slower |
| Complexity | Higher | Lower |
| Server required | Yes | No (static hosting) |

---

## Extending the Architecture

### Adding Authentication

1. Create auth middleware:
   ```
   // src/middleware/auth.ts
   export function requireAuth(req, res, next) {
     if (!req.session?.user) {
       return res.redirect('/login');
     }
     next();
   }
   ```

2. Apply to protected routes:
   ```
   app.get('/dashboard', requireAuth, (req, res) => {
     res.send(renderPage(pages.dashboard, {
       props: { user: req.session.user }
     }));
   });
   ```

### Adding Database

1. Install database client (e.g., `bun add @prisma/client`)

2. Create database utilities:
   ```
   // src/db/index.ts
   import { PrismaClient } from '@prisma/client';
   export const db = new PrismaClient();
   ```

3. Use in routes:
   ```
   app.get('/users/:id', async (req, res) => {
     const user = await db.user.findUnique({
       where: { id: req.params.id }
     });
     res.send(renderPage(pages.user, { props: { user } }));
   });
   ```

### Adding API Rate Limiting

1. Install rate limiter: `bun add express-rate-limit`

2. Apply to API routes:
   ```
   import rateLimit from 'express-rate-limit';

   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,  // 15 minutes
     max: 100  // 100 requests per window
   });

   app.use('/api', apiLimiter, apiRouter);
   ```

### Adding Streaming SSR

Replace `renderToString` with `renderToPipeableStream`:

```
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  const { pipe } = renderToPipeableStream(
    <StrictMode><Home {...props} /></StrictMode>,
    {
      onShellReady() {
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      }
    }
  );
});
```

**Benefits**:
- First byte sent sooner
- Better TTFB for slow components
- Suspense boundary support

**Trade-offs**:
- More complex implementation
- Can't modify headers after shell ready
- Requires different HTML template approach
