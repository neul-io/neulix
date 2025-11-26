import { Glob } from 'bun';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createElement, StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import type { BuildManifest, PageConfig, RenderOptions } from '../types';
import { createHtmlTemplate, getPageAssetTags } from './render';

const isDev = process.env.NODE_ENV !== 'production';

// Load manifest once at startup in production
let manifest: BuildManifest | undefined;
if (!isDev) {
  const manifestPath = join(process.cwd(), 'dist/manifest.json');
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  }
}

// Discover CSS files in dist/ for dev mode
async function getDevCssTags(): Promise<string> {
  const cssGlob = new Glob('dist/*.css');
  const cssFiles: string[] = [];
  for await (const file of cssGlob.scan('.')) {
    const baseName = file.split('/').pop()!;
    cssFiles.push(baseName);
  }
  return cssFiles.map(file => `<link rel="stylesheet" href="/${file}">`).join('\n    ');
}

export async function renderPage<P extends Record<string, unknown> = Record<string, never>>(
  page: PageConfig<P>,
  options: RenderOptions<P> = {}
): Promise<string> {
  const { props, title } = options;

  const appHtml = renderToString(
    createElement(StrictMode, null, createElement(page.component, (props ?? {}) as P))
  );

  let scriptTags = '';
  let cssTags = '';
  let preloadTags = '';

  const capitalizedName = page.name.charAt(0).toUpperCase() + page.name.slice(1);

  if (isDev) {
    cssTags = await getDevCssTags();

    if (page.hydrate) {
      scriptTags = `<script type="module" src="/${capitalizedName}.client.js"></script>`;
    }
  } else if (manifest) {
    const assets = getPageAssetTags(manifest, page.name, page.hydrate);
    cssTags = assets.cssTags;
    preloadTags = assets.preloadTags;
    scriptTags = assets.scriptTags;
  }

  // Only serialize props if page hydrates (client needs them)
  const propsJson = page.hydrate && props ? JSON.stringify(props) : undefined;

  return createHtmlTemplate({
    appHtml,
    scriptTags,
    cssTags,
    preloadTags,
    title,
    propsJson,
  });
}
