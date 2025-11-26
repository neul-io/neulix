import type { PageConfig } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

export const pages: Record<string, PageConfig> = {
  home: {
    component: Home,
    url: '/',
    hydrate: true,
  },
  about: {
    component: About,
    url: '/about',
    hydrate: true,
  },
  docs: {
    component: Docs,
    url: '/docs',
    hydrate: false,
  },
};
