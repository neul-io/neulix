import type { PageConfig } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

export const pages: Record<string, PageConfig> = {
  '/': {
    component: Home,
    entryName: 'home',
    hydrate: true,
  },
  '/about': {
    component: About,
    entryName: 'about',
    hydrate: true,
  },
  '/docs': {
    component: Docs,
    entryName: 'docs',
    hydrate: false,
  },
};

export function getPageConfig(path: string): PageConfig | null {
  return pages[path] || null;
}
