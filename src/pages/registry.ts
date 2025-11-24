import type { PageConfig, PageConfigAsync } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

// SSR registry with static imports (used server-side)
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

// Client registry with dynamic imports (used client-side for code splitting)
export const pagesAsync: Record<string, PageConfigAsync> = {
  '/': {
    componentLoader: () => import('./Home'),
    hydrate: true,
    componentPath: './Home',
  },
  '/about': {
    componentLoader: () => import('./About'),
    hydrate: true,
    componentPath: './About',
  },
  '/docs': {
    componentLoader: () => import('./Docs'),
    hydrate: false,
    componentPath: './Docs',
  },
};

export const GLOBAL_CSS_PATH = '/src/styles/global.css';

export function getPageConfig(path: string): PageConfig | null {
  return pages[path] || null;
}

export function getPageConfigAsync(path: string): PageConfigAsync | null {
  return pagesAsync[path] || null;
}
