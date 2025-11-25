import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHtmlTemplate, getPageAssetTags } from './render';
import type { PageConfig, PageManifest } from '../types';

const isDev = process.env.NODE_ENV !== 'production';

// Load manifest once at startup in production
let manifest: PageManifest | undefined;
if (!isDev) {
  const manifestPath = join(process.cwd(), 'dist/.vite/manifest.json');
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }
}

export function renderPage(pageConfig: PageConfig): string {
  const appHtml = renderToString(
    createElement(StrictMode, null, createElement(pageConfig.component))
  );

  let scriptTags = '';
  let cssTags = '';
  let preloadTags = '';

  const capitalizedEntry =
    pageConfig.entryName.charAt(0).toUpperCase() + pageConfig.entryName.slice(1);

  if (isDev) {
    cssTags = `<link rel="stylesheet" href="/src/pages/${capitalizedEntry}.css">`;

    if (pageConfig.hydrate) {
      const preamble = `
        import RefreshRuntime from '/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      `;
      scriptTags = `
    <script type="module">${preamble}</script>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/pages/${capitalizedEntry}.entry.tsx"></script>`;
    }
  } else if (manifest) {
    const assets = getPageAssetTags(manifest, pageConfig.entryName, pageConfig.hydrate);
    cssTags = assets.cssTags;
    preloadTags = assets.preloadTags;
    scriptTags = assets.scriptTags;
  }

  return createHtmlTemplate(appHtml, scriptTags, cssTags, preloadTags);
}
