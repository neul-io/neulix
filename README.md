# Bun React SSR

A minimal, fast, and fully controllable React SSR boilerplate built on Bun.

---

## What is this?

A **Multi-Page Application (MPA) template** with server-side rendered React, selective hydration, and zero framework magic. Built for developers who want performance without giving up control.

**Key features:**
- 🚀 **Bun-native** - Uses Bun's bundler, no Webpack/Vite needed
- ⚡ **Selective hydration** - Ship JS only to pages that need it
- 📦 **Code splitting** - Automatic chunk extraction for shared dependencies
- 🎨 **Tailwind CSS** - Purged and hashed for production
- 🔧 **Explicit routing** - Define routes in code, not filesystem
- 🗂️ **MPA architecture** - Each page is a separate entry point

---

## Quick Start

```bash
# Clone the template
git clone https://github.com/your-username/bun-react-ssr.git my-project
cd my-project

# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Start production server
bun start
```

---

## Philosophy

### Why This Exists

This is a **template/boilerplate** for developers who want:

1. **Control over the server** - No magic abstractions hiding what's happening. You own the Express app (or swap it for Elysia, Hono, Fastify). You define routes explicitly. You decide what middleware runs.

2. **No framework bloat** - Next.js and Remix are powerful but opinionated. They abstract away the server, bundle magic into your code, and make simple things complex. This template gives you raw access to everything.

3. **Performance first** - Every architectural decision prioritizes speed: Bun's native bundler, selective hydration to skip unnecessary JS, content-hashed assets for aggressive caching, minimal dependencies.

4. **"Just works" simplicity** - Clone, install, run. No configuration maze. No 47 config files. The defaults are sensible and the patterns are obvious.

5. **Easy to customize** - Want to swap Express for Elysia? Change one file. Want to add a database? Import it where you need it. No framework hooks or plugin systems to learn.

### What This Is NOT

- **Not a framework** - It's a starting point. Fork it, modify it, make it yours.
- **Not batteries-included** - No auth, no database, no admin panel. Add what you need.
- **Not for everyone** - If you want file-based routing, use Next.js. If you want nested layouts, use Remix. This is for developers who want explicit control.

### Core Principles

| Principle | Implementation |
|-----------|----------------|
| **Explicit over implicit** | Routes defined in code, not derived from filesystem |
| **Minimal dependencies** | Express, React, Tailwind. That's it. |
| **Server-first** | SSR by default, hydration opt-in per page |
| **Zero lock-in** | Standard Node/Bun APIs, no proprietary abstractions |
| **Performance by default** | Code splitting, asset hashing, CSS purging out of the box |

### Swappability

The architecture is designed with clear boundaries:

| Layer | Current | Swap For | Changes Required |
|-------|---------|----------|------------------|
| HTTP Server | Express | Elysia, Hono, Fastify | `src/server.ts` only |
| Bundler | Bun.build() | esbuild, Rollup | `config/build.ts`, `config/dev.ts` |
| CSS | Tailwind | vanilla CSS, Sass | `config/*.ts`, remove tailwind |
| Runtime | Bun | Node.js | Package scripts, minor API changes |

**To swap Express for Elysia**, you would:
1. `bun add elysia`
2. Rewrite `src/server.ts` (~50 lines)
3. Everything else stays the same

The SSR utilities (`src/utils/ssr.ts`, `src/utils/render.ts`) are framework-agnostic. They just return strings.

---

## Project Structure

```
project/
├── config/                     # Build and dev scripts
│   ├── dev.ts                  #   Development watcher
│   └── build.ts                #   Production build
│
├── src/
│   ├── api/                    # API endpoints
│   ├── client/                 # Client-side hydration
│   ├── pages/                  # React components + registry
│   ├── styles/                 # Tailwind CSS source
│   ├── utils/                  # SSR utilities
│   ├── server.ts               # Express app
│   └── types.ts                # TypeScript interfaces
│
├── public/                     # Static assets
└── dist/                       # Build output
```

---

## Adding a New Page

1. **Create the component** - `src/pages/MyPage.tsx`
2. **Add to registry** - `src/pages/registry.ts`
3. **Add route** - `src/server.ts`
4. **(Optional)** Create client entry - `src/pages/MyPage.client.tsx` (only if `hydrate: true`)

```typescript
// src/pages/registry.ts
export const pages = createPages({
  mypage: {
    component: MyPage,
    hydrate: true,  // false = SSR-only, no JS shipped
  },
});

// src/server.ts
app.get('/mypage', (_req, res) => {
  res.send(renderPage(pages.mypage, { title: 'My Page' }));
});
```

---

## Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation including:

- Complete file structure breakdown
- SSR and hydration flow
- Build process details
- Props system
- TypeScript patterns
- Performance considerations
- Troubleshooting guide

---

## License

MIT
