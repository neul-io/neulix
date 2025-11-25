import express, { type Request, type Response } from 'express';
import { join } from 'path';
import { pages } from './pages/registry';
import { pageHandler, setVite } from './utils/handler';
import { api } from './api';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  setVite(vite);
  app.use(vite.middlewares);
} else {
  app.use('/assets', express.static(join(process.cwd(), 'dist/assets')));
}

app.use(express.static(join(process.cwd(), 'public')));

// API routes
app.use('/api', api);

// Page routes
for (const [path, config] of Object.entries(pages)) {
  app.get(path, pageHandler(config));
}

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development' : 'production'}`);
  console.log(`Routes: ${Object.keys(pages).join(', ')}`);
});
