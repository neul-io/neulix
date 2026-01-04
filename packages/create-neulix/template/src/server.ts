import express, { type Request, type Response } from 'express';
import { renderPage } from 'neulix';
import { staticAssets } from 'neulix/express';
import { api } from './api';
import { pages } from './pages/registry';

const app = express();
const PORT = process.env.PORT || 8080;

// Serve static assets (dist/ and public/) with proper caching
staticAssets(app);

app.use('/api', api);

app.get('/', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.Home));
});

app.get('/docs', async (_req: Request, res: Response) => {
  res.send(await renderPage(pages.Docs));
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).send('Page not found');
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
