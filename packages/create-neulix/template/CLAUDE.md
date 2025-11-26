# Neulix Application

This is a Neulix application - a minimal, fast React SSR framework built on Bun.

---

## Stack

- **Runtime**: Bun
- **Framework**: Neulix (React SSR with selective hydration)
- **Styling**: Tailwind CSS v4
- **Server**: Express
- **Linting/Formatting**: Biome

---

## Project Structure

```
src/
├── server.ts              # Express server with routes (required)
├── pages/                 # Page components (required)
│   ├── registry.ts        #   Page configuration registry
│   ├── Home.tsx           #   Page component
│   ├── Home.client.tsx    #   Client entry (if hydrated)
│   └── Docs.tsx           #   SSR-only page (no .client.tsx)
├── components/            # Shared React components (optional)
├── api/                   # API route handlers (optional)
└── styles/                # CSS files (required)
    └── global.css         #   Main stylesheet
public/                    # Static assets (images, fonts)
dist/                      # Build output (gitignored)
```

---

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Check code with Biome |
| `bun run format` | Format code with Biome |
| `bun run docker` | Build and run Docker container |

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
import express from 'express';
import { renderPage } from 'neulix';
import { staticAssets } from 'neulix/express';
import { pages } from './pages/registry';

const app = express();

// Serve static assets (dist/ and public/)
staticAssets(app);

// Define routes explicitly
app.get('/', async (req, res) => {
  res.send(await renderPage(pages.home));
});

app.get('/docs', async (req, res) => {
  res.send(await renderPage(pages.docs));
});

app.listen(3000);
```

**Security note:** Routes are defined explicitly, NOT generated from registry. This prevents unintended route exposure.

---

## Styling with Tailwind CSS v4

**CSS entry file** (`src/styles/global.css`):
```css
@import "tailwindcss";
```

**Important:** Tailwind v4 uses `@import "tailwindcss"` instead of the v3 directives.

The CLI automatically builds all CSS files in `src/styles/` using `@tailwindcss/cli`.

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

## Build Output

### Development
```
dist/
├── global.css            # Unhashed CSS
├── Home.client.js        # Unhashed entry bundles
└── chunk-*.js            # Shared chunks (React, etc.)
```

### Production
```
dist/
├── manifest.json         # Asset mapping for SSR
├── global-{hash}.css     # Content-hashed CSS
├── Home.client-{hash}.js # Content-hashed entries
└── chunk-{hash}.js       # Content-hashed chunks
```

---

## SSR-Only vs Hydrated Pages

| Type | `hydrate` | Client File | JavaScript | Use Case |
|------|-----------|-------------|------------|----------|
| SSR-Only | `false` | Not needed | 0 KB | Static content, docs |
| Hydrated | `true` | Required | ~50+ KB | Interactive pages |

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

## Documentation

- [Neulix GitHub](https://github.com/neul-io/neulix)
- [Neulix on npm](https://www.npmjs.com/package/neulix)
