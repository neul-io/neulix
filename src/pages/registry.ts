import type { PageConfig, PageConfigAsync } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

// Single source of truth - SSR registry with static imports
export const pages: Record<string, PageConfig> = {
  '/': {
    component: Home,
    hydrate: true,
    componentPath: './Home',
  },
  '/about': {
    component: About,
    hydrate: true,
    componentPath: './About',
  },
  '/docs': {
    component: Docs,
    hydrate: false,
    componentPath: './Docs',
  },
};

// Map of component paths to dynamic imports (must be explicit for Vite)
const componentLoaders: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  './Home': () => import('./Home'),
  './About': () => import('./About'),
  './Docs': () => import('./Docs'),
};

// Auto-generate async registry from pages config
export const pagesAsync: Record<string, PageConfigAsync> = Object.fromEntries(
  Object.entries(pages).map(([path, config]) => [
    path,
    {
      componentLoader: componentLoaders[config.componentPath!],
      hydrate: config.hydrate,
      componentPath: config.componentPath!,
    },
  ])
);

export const GLOBAL_CSS_PATH = '/src/styles/global.css';

export function getPageConfig(path: string): PageConfig | null {
  return pages[path] || null;
}

export function getPageConfigAsync(path: string): PageConfigAsync | null {
  return pagesAsync[path] || null;
}
