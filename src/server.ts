import express, { type Request, type Response } from 'express';
import { join } from 'path';
import { api } from './api';
import { pages } from './pages/registry';
import { renderPage } from './utils/ssr';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

// Serve static assets with caching
if (isDev) {
  // Development: no caching
  app.use(express.static(join(process.cwd(), 'dist')));
  app.use(express.static(join(process.cwd(), 'public')));
} else {
  // Production: aggressive caching for hashed assets
  app.use(
    express.static(join(process.cwd(), 'dist'), {
      maxAge: '1y',
      immutable: true,
    })
  );
  app.use(
    express.static(join(process.cwd(), 'public'), {
      maxAge: '1d',
    })
  );
}

app.use('/api', api);

app.get('/', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.home));
});

app.get('/docs', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.docs));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development' : 'production'}`);
});
