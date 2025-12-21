# My Neulix App

A React SSR application built with [Neulix](https://github.com/your-username/neulix).

## Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build for production
bun run build

# Start production server
bun run start
```

Your app will be running at `http://localhost:8080`.

---

## Project Structure

```
my-app/
├── src/
│   ├── server.ts              # Express server and routes
│   ├── pages/                 # Page components
│   │   ├── registry.ts        #   Page configuration
│   │   ├── Home.tsx           #   Home page (hydrated)
│   │   ├── Home.client.tsx    #   Home client entry
│   │   └── Docs.tsx           #   Docs page (SSR-only)
│   ├── components/            # Shared components
│   │   ├── navbar.tsx
│   │   └── page.tsx
│   ├── api/                   # API routes
│   │   ├── index.ts
│   │   └── health.ts
│   └── styles/                # CSS files
│       └── global.css
├── public/                    # Static assets
│   └── favicon.svg
└── package.json
```

---

## Configuration

### Pages Registry

Define your pages in `src/pages/registry.ts`:

```typescript
import { createPages } from 'neulix';
import Home from './Home';
import Docs from './Docs';

export const pages = createPages({
  home: {
    component: Home,
    hydrate: true,    // Ships JavaScript - interactive
  },
  docs: {
    component: Docs,
    hydrate: false,   // No JavaScript - pure SSR
  },
});
```

### Server Routes

Define routes in `src/server.ts`:

```typescript
app.get('/', async (req, res) => {
  res.send(await renderPage(pages.home));
});

app.get('/docs', async (req, res) => {
  res.send(await renderPage(pages.docs));
});
```

Routes are explicit - you control exactly what URLs your app responds to.

---

## Adding a New Page

### Interactive Page (with JavaScript)

1. **Create the component** - `src/pages/Contact.tsx`:
   ```tsx
   import { useState } from 'react';

   export default function Contact() {
     const [sent, setSent] = useState(false);

     return (
       <div>
         <h1>Contact Us</h1>
         <button onClick={() => setSent(true)}>
           {sent ? 'Sent!' : 'Send Message'}
         </button>
       </div>
     );
   }
   ```

2. **Create client entry** - `src/pages/Contact.client.tsx`:
   ```tsx
   import { hydrate } from 'neulix/client';
   import Contact from './Contact';

   hydrate(Contact);
   ```

3. **Add to registry** - `src/pages/registry.ts`:
   ```typescript
   import Contact from './Contact';

   export const pages = createPages({
     // ... existing pages
     contact: {
       component: Contact,
       hydrate: true,
     },
   });
   ```

4. **Add route** - `src/server.ts`:
   ```typescript
   app.get('/contact', async (req, res) => {
     res.send(await renderPage(pages.contact, { title: 'Contact' }));
   });
   ```

### Static Page (SSR-only, zero JavaScript)

1. **Create the component** - `src/pages/Privacy.tsx`:
   ```tsx
   export default function Privacy() {
     return (
       <div>
         <h1>Privacy Policy</h1>
         <p>Your privacy is important to us...</p>
       </div>
     );
   }
   ```

2. **Add to registry** with `hydrate: false`:
   ```typescript
   privacy: {
     component: Privacy,
     hydrate: false,
   },
   ```

3. **Add route** in server
4. **No client file needed!**

---

## Passing Data to Pages

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

Props are automatically passed to the client for hydration.

---

## Styling

This project uses **Tailwind CSS v4**. The main stylesheet is at `src/styles/global.css`:

```css
@import "tailwindcss";

/* Add custom styles below */
```

All `.css` files in `src/styles/` are automatically processed and available in your pages.

---

## Static Assets

Place static files in the `public/` directory:

```
public/
├── favicon.svg
├── images/
│   └── logo.png
└── fonts/
    └── custom.woff2
```

Access them with absolute paths: `/favicon.svg`, `/images/logo.png`.

---

## API Routes

API routes are defined in `src/api/`:

```typescript
// src/api/health.ts
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

export default router;
```

Mount in `src/api/index.ts`:

```typescript
import health from './health';

const router = Router();
router.use('/health', health);

export { router as api };
```

Access at `/api/health`.

---

## CLI Options

```bash
# Custom server file
neulix dev --server=src/server.ts
neulix start --server=src/server.ts

# Custom pages registry
neulix dev --pages=src/pages/registry.ts
neulix build --pages=src/pages/registry.ts
```

---

## Production

```bash
# Build optimized assets
bun run build

# Start production server
bun run start
```

Production builds include:
- Minified JavaScript with code splitting
- Content-hashed filenames for caching
- Purged and minified CSS

---

## Learn More

- [Neulix Documentation](https://github.com/your-username/neulix)
- [Tailwind CSS](https://tailwindcss.com)
- [React](https://react.dev)
- [Bun](https://bun.sh)
