import type { PageManifest } from '../types';

export function getAssetTags(
  manifest: PageManifest,
  entryPoint: string = 'main'
): {
  scriptTags: string;
  cssTags: string;
} {
  const entry = manifest[entryPoint];

  if (!entry) {
    return { scriptTags: '', cssTags: '' };
  }

  const cssFiles = entry.css || [];
  const cssTags = cssFiles.map(file => `<link rel="stylesheet" href="/${file}">`).join('\n    ');

  const scriptTags = `<script type="module" src="/${entry.file}"></script>`;

  return { scriptTags, cssTags };
}

export function createHtmlTemplate(
  appHtml: string,
  scriptTags: string,
  cssTags: string,
  hydrate: boolean
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Vite SSR</title>
    ${cssTags}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    ${hydrate ? scriptTags : ''}
  </body>
</html>`;
}
