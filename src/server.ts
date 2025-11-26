import express, { type Request, type Response } from 'express';
import { join } from 'path';
import { renderPage } from './utils/ssr';
import { pages } from './pages/registry';
import { api } from './api';

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

// API routes
app.use('/api', api);

// Page routes
app.get('/', (_req: Request, res: Response) => {
  res.send(renderPage(pages.home));
});

app.get('/about', (_req: Request, res: Response) => {
  res.send(renderPage(pages.about));
});

app.get('/docs', (_req: Request, res: Response) => {
  res.send(renderPage(pages.docs));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development' : 'production'}`);
});
