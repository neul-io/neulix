# Bun + Vite + Express SSR

A production-ready server-side rendering setup with optional client-side hydration, code splitting, and Tailwind CSS.

## Features

- **Express Server** - Fast HTTP server with SSR support
- **TypeScript Only** - 100% TypeScript, no JavaScript files
- **ES Modules** - All code uses ES Modules (import/export), no CommonJS
- **Vite + SSR** - Server-side rendering with Vite for client bundling
- **Tailwind CSS** - Optimized with content purging, only used classes included
- **Per-Route Code Splitting** - Each route only loads its own JavaScript chunk
- **Optional Hydration** - Choose per-page whether to hydrate or serve static HTML
- **Auto-Restart Dev Mode** - File changes restart the server automatically
- **Static Assets** - Serve from `public/` and `dist/` folders
- **Dev & Prod Modes** - Separate configurations for development and production
- **Code Quality** - ESLint + Prettier + TypeScript strict checks

## Commands

### Development

```bash
bun dev
```

Starts the development server with auto-restart on file changes.

### Production

```bash
# Build for production
bun run build

# Start production server
bun start
```

### Code Quality

```bash
# Run ESLint
bun run lint

# Run ESLint with auto-fix
bun run lint:fix

# Format code with Prettier
bun run format

# Check formatting
bun run format:check

# Run TypeScript type checking
bun run type-check

# Run all checks (type-check + lint + format)
bun run check
```

## Project Structure

```
src/
├── pages/
│   ├── registry.ts      # Page configuration (hydration control)
│   ├── Home.tsx         # Home page (hydrated)
│   ├── About.tsx        # About page (hydrated)
│   └── Docs.tsx         # Docs page (static, no hydration)
├── client/
│   └── entry-client.tsx # Client-side hydration entry
├── server/
│   └── entry-server.tsx # Server-side rendering entry
├── utils/
│   └── render.ts        # HTML template utilities
├── styles/
│   └── global.css       # Global Tailwind styles
├── types.ts             # TypeScript type definitions
├── server.ts            # Express server
├── dev.ts              # Development mode with auto-restart
└── build.ts            # Production build script
```

## Adding New Pages

1. Create your page component in `src/pages/`
2. Add static import at the top of `src/pages/registry.ts`
3. Add entry to the `pages` object
4. Add corresponding dynamic import to `componentLoaders` map

```typescript
// 1. Add static import
import MyPage from './MyPage';

// 2. Add to pages registry
export const pages: Record<string, PageConfig> = {
  '/my-page': {
    component: MyPage,
    hydrate: true,  // or false for static pages
    componentPath: './MyPage',
  },
};

// 3. Add to componentLoaders
const componentLoaders: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  './MyPage': () => import('./MyPage'),
};
```

The `pagesAsync` registry is automatically generated from these two sources.

## Hydration Control

Each page can specify whether it needs client-side JavaScript:

- **`hydrate: true`** - Loads React on the client for interactivity (useState, onClick, etc.)
- **`hydrate: false`** - Serves pure HTML with no JavaScript (great for docs, blogs, static content)

## Architecture Deep Dive

### Code Splitting Strategy

This project implements **per-route code splitting** using dynamic imports:

**Problem**: Initially, all pages bundled into one 146KB file, so visiting the home page would download About and Docs code unnecessarily.

**Solution**: Use dynamic imports `() => import('./Page')` to tell Vite to create separate chunks per route.

**Result**:
- Home page: ~1KB (Home chunk) + 143KB (React vendor chunk, cached)
- About page: ~1KB (About chunk) + cached vendor
- Docs page: 0KB (no hydration)

### Dual Registry Pattern

The project maintains two registries serving different purposes:

1. **`pages` (Static Registry)**: Uses ES module static imports
   - Required for server-side rendering (SSR)
   - Provides synchronous access to components
   - Used by `src/server.ts` to render HTML

2. **`pagesAsync` (Async Registry)**: Uses dynamic imports
   - Required for client-side code splitting
   - Returns promises that Vite analyzes to create separate chunks
   - Used by `src/client/entry-client.tsx` for hydration

**Why Both?**
- SSR needs synchronous component access (can't await during request handling)
- Code splitting requires dynamic imports (static imports bundle everything together)
- Having both in the same file prevents Vite from splitting (it sees both static and dynamic imports)

**Trade-off**: You must maintain both registries, but the duplication is minimal and `pagesAsync` auto-generates from `pages` config.

### SSR vs Client Flow

**Development Mode**:
1. User runs `bun dev`
2. `src/dev.ts` spawns `src/server.ts` with file watcher
3. Express server integrates Vite dev middleware for HMR
4. On route request:
   - Server queries `pages` registry
   - Bun renders React component to HTML string
   - HTML includes source CSS/JS paths
   - Browser loads entry point via Vite dev server
   - Client queries `pagesAsync` registry
   - Dynamic import loads page component
   - React hydrates DOM

**Production Mode**:
1. User runs `bun run build`
2. `src/build.ts` invokes Vite build
3. Vite bundles `src/client/entry-client.tsx`
4. Dynamic imports in `componentLoaders` create split points
5. Vite generates separate chunks per page + shared vendor chunk
6. Outputs to `dist/assets/` with content hashes + manifest.json
7. User runs `bun start`
8. On route request:
   - Server queries `pages` registry
   - Renders React component to HTML string
   - Reads manifest.json to find hashed asset filenames
   - Injects CSS link tags (always)
   - Injects script tags (only if hydrate: true)
   - Browser downloads only the specific page chunk needed

### CSS Strategy

**Global CSS Approach**: One `global.css` file with all Tailwind utilities

**Why Not Per-Route CSS?**
- Tailwind purging already removes unused classes (8.55KB total)
- One cached file serves all routes (better than multiple small files)
- Avoids duplicate utilities across chunks
- Simpler asset management

**CSS File Size After Purging**:
- Uncompressed: 8.55 KB
- Gzipped: 2.3 KB
- Contains only classes used across all pages

**Purging Process**:
1. Tailwind scans `src/**/*.{ts,tsx,html}` at build time
2. Extracts all class name strings from source files
3. Generates CSS only for discovered classes
4. Removes thousands of unused utilities

**Trade-off**: All pages download the same CSS, but it's tiny and fully cached after first visit.

### Vite Configuration Details

**Key Settings**:
- `build.manifest: true` - Generates manifest.json mapping modules to hashed files
- `build.cssCodeSplit: true` - Enables per-chunk CSS generation (unused with global CSS)
- `rollupOptions.input` - Sets client entry point
- `rollupOptions.output` - Configures hash-based filenames
- `css.postcss` - Inlines Tailwind and Autoprefixer (no separate PostCSS config)
- `ssr.external` - Prevents Vite from transforming React modules (Bun handles them natively)

**Why Inline PostCSS?**
PostCSS doesn't natively support TypeScript configs, so Tailwind and Autoprefixer are configured directly in `vite.config.ts`.

### File Watcher Implementation

`src/dev.ts` uses Bun's native `fs.watch` API:
- Monitors `src/` directory recursively
- Filters for `.ts`, `.tsx`, `.css` changes
- Kills current server subprocess on change
- Spawns new subprocess with `NODE_ENV=development`
- Handles SIGINT/SIGTERM for graceful shutdown

**Why Not HMR?**
Server-side code can't use Hot Module Replacement, so full process restart is necessary. Client-side gets HMR through Vite dev middleware.

## Environment Variables

- `NODE_ENV` - Set to `production` for production mode (default: development)
- `PORT` - Server port (default: 3001)

## Tech Stack

- **Bun** - JavaScript runtime and package manager (native TypeScript/JSX support)
- **Express** - Web server framework (HTTP routing and middleware)
- **Vite** - Build tool and dev server (client bundling and HMR)
- **React** - UI library with SSR (renderToString + hydrateRoot)
- **Tailwind CSS** - Utility-first CSS framework (purging via PostCSS)
- **TypeScript** - Type-safe development (strict mode enabled)
- **ESLint** - Code linting (TypeScript and React rules)
- **Prettier** - Code formatting (integrated with ESLint)

## Performance Characteristics

### Bundle Sizes (Production)

- **CSS**: 8.55 KB (2.3 KB gzipped) - Global stylesheet with purged Tailwind
- **Vendor Chunk**: 143 KB (46 KB gzipped) - React, React-DOM, shared dependencies
- **Page Chunks**:
  - Home: ~1 KB
  - About: ~1.3 KB
  - Docs: ~2 KB (not loaded, no hydration)

### Load Time Analysis

**First Visit to Home Page**:
- HTML: ~5 KB (SSR rendered)
- CSS: 2.3 KB gzipped (cached)
- Vendor JS: 46 KB gzipped (cached)
- Home chunk: ~0.5 KB gzipped
- **Total**: ~54 KB initial load

**Navigate to About Page**:
- HTML: ~5 KB (new SSR)
- CSS: 0 KB (cache hit)
- Vendor JS: 0 KB (cache hit)
- About chunk: ~0.6 KB gzipped
- **Total**: ~6 KB subsequent navigation

**Docs Page (Static)**:
- HTML: ~5 KB (new SSR)
- CSS: 0 KB (cache hit)
- JS: 0 KB (no hydration)
- **Total**: ~5 KB

### SSR Benefits

1. **SEO**: Search engines receive fully rendered HTML
2. **Time to First Paint**: Content visible before JavaScript loads
3. **Accessibility**: Works without JavaScript enabled
4. **Performance**: Reduces client-side rendering cost

## Known Limitations

### Dual Registry Maintenance

The `pages` and `componentLoaders` registries must be kept in sync manually. This is necessary because:
- Static imports are required for SSR performance
- Dynamic imports are required for code splitting
- Having both in the same file prevents Vite from splitting chunks

**Mitigation**: Keep them visually adjacent in the same file, and `pagesAsync` auto-generates from both sources.

### Vite SSR Module Conflict

Vite's SSR mode conflicts with Bun's native React rendering, causing "module is not defined" errors in CommonJS React modules.

**Solution**:
- Externalize React in `vite.config.ts`: `ssr.external: ['react', 'react-dom', ...]`
- Use Bun's native rendering in dev mode instead of Vite's `ssrLoadModule`

### PostCSS TypeScript Config

PostCSS doesn't support `.ts` config files without ts-node.

**Solution**: Inline PostCSS plugins in `vite.config.ts` instead of separate `postcss.config.ts`.

## Future Improvements

1. **File-based routing**: Eliminate registry maintenance by deriving routes from file system
2. **Automatic registry generation**: Build script that scans pages and generates registry
3. **Route-level CSS splitting**: Split CSS per route if global CSS grows beyond 50KB
4. **Streaming SSR**: Use `renderToPipeableStream` for faster TTFB on slow networks
5. **Partial hydration**: Hydrate only interactive components (islands architecture)

## Troubleshooting

### Build shows "dynamically imported but also statically imported" warning

This happens when the same module has both static and dynamic imports in the same file. This prevents code splitting.

**Fix**: Keep static imports (for SSR) and dynamic imports (for code splitting) in separate locations of the codebase.

### Page renders but doesn't hydrate

Check:
1. `hydrate: true` in page config
2. Script tag is present in HTML source
3. Browser console for hydration errors
4. Component has no SSR/client mismatches (different output server vs client)

### CSS not loading on certain pages

Check:
1. CSS link tag is present in HTML source
2. CSS file exists in `dist/assets/` (production) or Vite serves it (dev)
3. Server always includes CSS tags regardless of hydration flag

### Dev server not restarting on changes

Check:
1. File changed is in `src/` directory
2. File extension is `.ts`, `.tsx`, or `.css`
3. No errors in terminal preventing restart
4. File watcher has permission to monitor directory
