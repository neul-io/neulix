import express from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPageConfig, GLOBAL_CSS_PATH } from './pages/registry';
import { render } from './server/entry-server';
import { createHtmlTemplate, getAssetTags } from './utils/render';
import type { PageManifest } from './types';
import type { ViteDevServer } from 'vite';

const app = express();
const PORT = process.env.PORT || 3001;
const isDev = process.env.NODE_ENV !== 'production';

let vite: ViteDevServer | undefined;

if (isDev) {
  const { createServer } = await import('vite');
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });
  app.use(vite.middlewares);
} else {
  app.use('/assets', express.static(join(process.cwd(), 'dist/assets')));
}

app.use(express.static(join(process.cwd(), 'public')));

app.get('*', async (req, res) => {
  try {
    const url = req.originalUrl;
    const pageConfig = getPageConfig(url);

    if (!pageConfig) {
      res.status(404).send('Page not found');
      return;
    }

    let appHtml: string;
    let scriptTags = '';
    let cssTags = '';

    if (isDev && vite) {
      // In dev mode, use Bun's native rendering (already imported)
      appHtml = render(pageConfig);

      // Always include global CSS in dev mode
      cssTags = `<link rel="stylesheet" href="${GLOBAL_CSS_PATH}">`;

      if (pageConfig.hydrate) {
        scriptTags = `<script type="module" src="/src/client/entry-client.tsx"></script>`;
      }
    } else {
      appHtml = render(pageConfig);

      const manifestPath = join(process.cwd(), 'dist/.vite/manifest.json');
      if (existsSync(manifestPath)) {
        const manifest: PageManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
        const assets = getAssetTags(manifest, 'src/client/entry-client.tsx');

        // Always include CSS
        cssTags = assets.cssTags;

        // Only include JS if page is hydrated
        if (pageConfig.hydrate) {
          scriptTags = assets.scriptTags;
        }
      }
    }

    const html = createHtmlTemplate(appHtml, scriptTags, cssTags, pageConfig.hydrate);

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (error) {
    if (isDev && vite) {
      vite.ssrFixStacktrace(error as Error);
    }
    console.error('Error rendering page:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Environment: ${isDev ? 'development' : 'production'}`);
});
