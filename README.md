# Neulix

A minimal, fast, and fully controllable React SSR framework built on Bun.

---

## What is Neulix?

A **Multi-Page Application (MPA) framework** with server-side rendered React, selective hydration, and zero framework magic. Built for developers who want performance without giving up control.

**Key features:**
- **Bun-native** - Uses Bun's bundler, no Webpack/Vite needed
- **Selective hydration** - Ship JS only to pages that need it
- **Code splitting** - Automatic chunk extraction for shared dependencies
- **Tailwind CSS v4** - Purged and hashed for production
- **Explicit routing** - Define routes in code, not filesystem
- **Express middleware** - Built-in static asset handling (optional, Elysia and plain Bun support coming soon)
- **CLI tools** - `neulix dev`, `neulix build`, `neulix start`

---

## Quick Start

```bash
# Create a new project
bunx create-neulix my-app

# Navigate to project
cd my-app

# Install dependencies
bun install

# Start development server
bun run dev
```

Your app will be running at `http://localhost:8080`.

---

## Project Structure

A Neulix app has this structure:

```
my-app/
├── src/
│   ├── server.ts              # Express server (required)
│   ├── pages/                 # Page components (required)
│   │   ├── registry.ts        #   Page configuration
│   │   ├── Home.tsx           #   Page component
│   │   ├── Home.client.tsx    #   Client entry (if hydrated)
│   │   └── Docs.tsx           #   SSR-only page
│   ├── components/            # Shared components (optional)
│   ├── api/                   # API routes (optional)
│   └── styles/                # CSS files (required)
│       └── global.css
├── public/                    # Static assets
└── package.json
```

---

## How It Works

### 1. Define Pages in Registry

```typescript
// src/pages/registry.ts
import { createPages } from 'neulix';
import Home from './Home';
import Docs from './Docs';

export const pages = createPages({
  Home: {
    component: Home,
    hydrate: true,    // Interactive - ships JavaScript
  },
  Docs: {
    component: Docs,
    hydrate: false,   // Static - zero JavaScript
  },
});
```

Registry keys are used directly as file paths. For nested directories, use path-style keys:

```typescript
export const pages = createPages({
  Home: { ... },                      // → src/pages/Home.client.tsx
  'console/Users': { ... },           // → src/pages/console/Users.client.tsx
  'console/project/Builds': { ... },  // → src/pages/console/project/Builds.client.tsx
});
```

### 2. Create Client Entry (for hydrated pages)

```typescript
// src/pages/Home.client.tsx
import { hydrate } from 'neulix/client';
import Home from './Home';

hydrate(Home);
```

### 3. Define Routes in Server

```typescript
// src/server.ts
import express from 'express';
import { renderPage } from 'neulix';
import { staticAssets } from 'neulix/express';
import { pages } from './pages/registry';

const app = express();

staticAssets(app);

app.get('/', async (req, res) => {
  res.send(await renderPage(pages.home));
});

app.get('/docs', async (req, res) => {
  res.send(await renderPage(pages.docs));
});

app.listen(8080);
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `neulix dev` | Start development server with hot reload |
| `neulix build` | Build for production |
| `neulix start` | Start production server |

---

## Styling with Tailwind CSS v4

A `global.css` file is automatically created for you:

```css
/* src/styles/global.css */
@import "tailwindcss";
```

You can modify this file or add additional CSS files to `src/styles/`. The CLI automatically builds all CSS files in this directory using `@tailwindcss/cli`.

---

## Static Assets

The `staticAssets` middleware serves two directories:

| Directory | Purpose | Production Cache |
|-----------|---------|------------------|
| `dist/` | Build output (JS, CSS) | 1 year, immutable |
| `public/` | Static files (images, fonts) | 1 day |

```typescript
import { staticAssets } from 'neulix/express';

staticAssets(app);

// Or with custom options
staticAssets(app, {
  distPath: 'dist',
  publicPath: 'public',
  hashedAssetMaxAge: '1y',
  publicAssetMaxAge: '1d',
});
```

---

## Passing Props to Pages

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
export default function User({ user }) {
  return <h1>Hello, {user.name}</h1>;
}
```

Props are automatically serialized and passed to the client for hydration.

---

## Docker

A production-ready Dockerfile is included with multi-stage builds for optimal image size:

```bash
# Build and run with Docker
bun run docker
```

The Dockerfile uses:
- `oven/bun:1` for building
- `oven/bun:1-slim` for production (smaller image)
- Non-root user for security
- Separate dependency and build stages for better caching

---

## Linting & Formatting

Neulix includes [Biome](https://biomejs.dev) for fast linting and formatting:

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run format
```

---

## SSR-Only vs Hydrated Pages

| Type | `hydrate` | Client File | JavaScript | Use Case |
|------|-----------|-------------|------------|----------|
| SSR-Only | `false` | Not needed | 0 KB | Static content, docs |
| Hydrated | `true` | Required | ~50+ KB | Interactive pages |

**SSR-only pages are ideal for:**
- Documentation
- Marketing pages
- Privacy policies
- Any content that doesn't need interactivity

---

## Philosophy

### Why Neulix?

1. **Control over the server** - No magic abstractions. You own the Express app. You define routes explicitly.

2. **No framework bloat** - Next.js and Remix are powerful but opinionated. Neulix gives you raw access to everything.

3. **Performance first** - Selective hydration, code splitting, content-hashed assets, minimal dependencies.

4. **Easy to customize** - Want to swap Express for Elysia? Change one file. No plugin systems to learn.

### What Neulix Is NOT

- **Not batteries-included** - No auth, no database, no admin panel. Add what you need.
- **Not for everyone** - If you want file-based routing, use Next.js. This is for developers who want explicit control.

---

## Documentation

See [CLAUDE.md](./CLAUDE.md) for detailed technical documentation:

- Monorepo architecture
- CLI internals
- Build process details
- TypeScript patterns
- Troubleshooting guide

---

## Monorepo Structure (for contributors)

```
neulix/
├── packages/
│   ├── neulix/          # Core framework
│   └── create-neulix/   # Scaffolding tool
├── apps/
│   └── example/         # Example application
└── package.json         # Workspace config
```

---

## License

MIT
