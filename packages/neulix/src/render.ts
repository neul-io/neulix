import type { BuildManifest, HtmlTemplateOptions } from './types';

export function getPageAssetTags(
  manifest: BuildManifest,
  entryName: string,
  hydrate: boolean
): {
  scriptTags: string;
  cssTags: string;
  preloadTags: string;
} {
  const entry = manifest[entryName];

  if (!entry) {
    return { scriptTags: '', cssTags: '', preloadTags: '' };
  }

  // CSS tag
  const cssTags = `<link rel="stylesheet" href="/${entry.css}">`;

  // SSR-only pages don't need JS or preloads
  if (!hydrate || !entry.js) {
    return { scriptTags: '', cssTags, preloadTags: '' };
  }

  // Modulepreload hints for shared chunks
  const preloadTags = entry.imports
    ? entry.imports.map(file => `<link rel="modulepreload" href="/${file}">`).join('\n    ')
    : '';

  // Entry script tag
  const scriptTags = `<script type="module" src="/${entry.js}"></script>`;

  return { scriptTags, cssTags, preloadTags };
}

export function createHtmlTemplate({
  appHtml,
  scriptTags,
  cssTags,
  preloadTags = '',
  title = 'App',
  propsJson,
  headTags = '',
  bodyTags = '',
}: HtmlTemplateOptions): string {
  const propsScript = propsJson ? `<script id="__PROPS__" type="application/json">${propsJson}</script>` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${cssTags}
    ${preloadTags}
    ${headTags}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    ${propsScript}
    ${scriptTags}
    ${bodyTags}
  </body>
</html>`;
}
