import type { PageManifest, ManifestChunk } from '../types';

/**
 * Recursively collect all CSS files from an entry and its imports
 */
function collectCss(manifest: PageManifest, chunk: ManifestChunk, collected: Set<string>): void {
  // Add CSS from this chunk
  if (chunk.css) {
    for (const css of chunk.css) {
      collected.add(css);
    }
  }

  // Recursively collect from imports
  if (chunk.imports) {
    for (const importKey of chunk.imports) {
      const importedChunk = manifest[importKey];
      if (importedChunk) {
        collectCss(manifest, importedChunk, collected);
      }
    }
  }
}

/**
 * Collect modulepreload hints for imported chunks
 */
function collectModulePreloads(manifest: PageManifest, chunk: ManifestChunk, collected: Set<string>): void {
  if (chunk.imports) {
    for (const importKey of chunk.imports) {
      const importedChunk = manifest[importKey];
      if (importedChunk && !collected.has(importedChunk.file)) {
        collected.add(importedChunk.file);
        collectModulePreloads(manifest, importedChunk, collected);
      }
    }
  }
}

export function getPageAssetTags(
  manifest: PageManifest,
  entryName: string,
  hydrate: boolean
): {
  scriptTags: string;
  cssTags: string;
  preloadTags: string;
} {
  const capitalizedEntry = entryName.charAt(0).toUpperCase() + entryName.slice(1);

  // Entry key depends on whether page hydrates
  const entryKey = hydrate
    ? `src/pages/${capitalizedEntry}.entry.tsx`
    : `src/pages/${capitalizedEntry}.css`;

  const entry = manifest[entryKey];

  if (!entry) {
    return { scriptTags: '', cssTags: '', preloadTags: '' };
  }

  // For CSS-only entries, the file IS the CSS
  // For JS entries, CSS is in the css array
  const cssFiles = new Set<string>();
  if (entry.file.endsWith('.css')) {
    cssFiles.add(entry.file);
  } else {
    collectCss(manifest, entry, cssFiles);
  }
  const cssTags = Array.from(cssFiles)
    .map(file => `<link rel="stylesheet" href="/${file}">`)
    .join('\n    ');

  // SSR-only pages don't need JS or preloads
  if (!hydrate) {
    return { scriptTags: '', cssTags, preloadTags: '' };
  }

  // Collect modulepreload hints for imported chunks
  const preloadFiles = new Set<string>();
  collectModulePreloads(manifest, entry, preloadFiles);
  const preloadTags = Array.from(preloadFiles)
    .map(file => `<link rel="modulepreload" href="/${file}">`)
    .join('\n    ');

  // Entry script tag
  const scriptTags = `<script type="module" src="/${entry.file}"></script>`;

  return { scriptTags, cssTags, preloadTags };
}

export function createHtmlTemplate(
  appHtml: string,
  scriptTags: string,
  cssTags: string,
  preloadTags: string = ''
): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bun Vite SSR</title>
    ${cssTags}
    ${preloadTags}
  </head>
  <body>
    <div id="root">${appHtml}</div>
    ${scriptTags}
  </body>
</html>`;
}
