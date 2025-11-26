import type { Express } from 'express';
import { join } from 'path';

export interface StaticAssetsOptions {
  /** Path to built assets (default: 'dist') */
  distPath?: string;
  /** Path to public assets (default: 'public') */
  publicPath?: string;
  /** Cache max-age for hashed assets in production (default: '1y') */
  hashedAssetMaxAge?: string;
  /** Cache max-age for public assets in production (default: '1d') */
  publicAssetMaxAge?: string;
}

/**
 * Configure static asset serving for a Neulix app.
 *
 * In development: No caching, serves from dist/ and public/
 * In production: Aggressive caching for hashed assets in dist/, moderate caching for public/
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { staticAssets } from 'neulix/express';
 *
 * const app = express();
 * staticAssets(app);
 * ```
 */
export function staticAssets(app: Express, options: StaticAssetsOptions = {}): void {
  const {
    distPath = 'dist',
    publicPath = 'public',
    hashedAssetMaxAge = '1y',
    publicAssetMaxAge = '1d',
  } = options;

  const isDev = process.env.NODE_ENV !== 'production';

  // Import express.static dynamically to avoid bundling issues
  const express = require('express');

  if (isDev) {
    // Development: no caching
    app.use(express.static(join(process.cwd(), distPath)));
    app.use(express.static(join(process.cwd(), publicPath)));
  } else {
    // Production: aggressive caching for hashed assets
    app.use(
      express.static(join(process.cwd(), distPath), {
        maxAge: hashedAssetMaxAge,
        immutable: true,
      })
    );
    app.use(
      express.static(join(process.cwd(), publicPath), {
        maxAge: publicAssetMaxAge,
      })
    );
  }
}
