import type { Request, Response } from 'express';
import type { ViteDevServer } from 'vite';
import type { PageConfig } from '../types';
import { renderPage } from '../utils/ssr';

const isDev = process.env.NODE_ENV !== 'production';

let vite: ViteDevServer | undefined;

export function setVite(viteServer: ViteDevServer) {
  vite = viteServer;
}

export function pageHandler(pageConfig: PageConfig) {
  return (_req: Request, res: Response) => {
    try {
      const html = renderPage(pageConfig);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (error) {
      if (isDev && vite) {
        vite.ssrFixStacktrace(error as Error);
      }
      console.error('Error rendering page:', error);
      res.status(500).send('Internal Server Error');
    }
  };
}
