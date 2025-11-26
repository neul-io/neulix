import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHtmlTemplate, getPageAssetTags } from './render';
import { pages } from '../pages/registry';
import type { BuildManifest } from '../types';

const isDev = process.env.NODE_ENV !== 'production';

// Load manifest once at startup in production
let manifest: BuildManifest | undefined;
if (!isDev) {
  const manifestPath = join(process.cwd(), 'dist/manifest.json');
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }
}

export function renderPage(entryName: string): string {
  const pageConfig = pages[entryName];
  if (!pageConfig) {
    throw new Error(`Page not found: ${entryName}`);
  }

  const appHtml = renderToString(
    createElement(StrictMode, null, createElement(pageConfig.component))
  );

  let scriptTags = '';
  let cssTags = '';
  let preloadTags = '';

  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);

  if (isDev) {
    cssTags = '<link rel="stylesheet" href="/styles.css">';

    if (pageConfig.hydrate) {
      scriptTags = `<script type="module" src="/${capitalizedEntry}.client.js"></script>`;
    }
  } else if (manifest) {
    const assets = getPageAssetTags(manifest, entryName, pageConfig.hydrate);
    cssTags = assets.cssTags;
    preloadTags = assets.preloadTags;
    scriptTags = assets.scriptTags;
  }

  return createHtmlTemplate(appHtml, scriptTags, cssTags, preloadTags);
}
