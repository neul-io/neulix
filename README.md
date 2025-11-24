# Bun + Vite + Express SSR

A production-ready server-side rendering setup with optional client-side hydration, code splitting, and Tailwind CSS.

## Features

- **Express Server** - Fast HTTP server with SSR support
- **TypeScript Only** - 100% TypeScript, no JavaScript files
- **ES Modules** - All code uses ES Modules (import/export), no CommonJS
- **Vite + SSR** - Server-side rendering with Vite for client bundling
- **Tailwind CSS** - Optimized with content purging, only used classes included
- **Smart Code Splitting** - Each route only loads its dependencies (CSS + JS)
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
├── server.ts            # Express server
├── dev.ts              # Development mode with auto-restart
└── build.ts            # Production build script
```

## Adding New Pages

1. Create your page component in `src/pages/`
2. Register it in `src/pages/registry.ts`:

```typescript
export const pages: Record<string, PageConfig> = {
  '/my-page': {
    component: MyPage,
    hydrate: true,  // or false for static pages
  },
};
```

## Hydration Control

Each page can specify whether it needs client-side JavaScript:

- **`hydrate: true`** - Loads React on the client for interactivity
- **`hydrate: false`** - Serves pure HTML with no JavaScript (great for docs, blogs, static content)

## Code Splitting

Vite automatically splits code per route. Only the CSS and JavaScript needed for each page is loaded, reducing bundle size and improving performance.

## Environment Variables

- `NODE_ENV` - Set to `production` for production mode
- `PORT` - Server port (default: 3000)

## Tech Stack

- **Bun** - JavaScript runtime and package manager
- **Express** - Web server framework
- **Vite** - Build tool and dev server
- **React** - UI library with SSR
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **ESLint** - Code linting with TypeScript and React rules
- **Prettier** - Code formatting
