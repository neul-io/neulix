import { createPages } from 'neulix';
import Docs from './Docs';
import Home from './Home';

export const pages = createPages({
  home: {
    component: Home,
    hydrate: true,
  },
  docs: {
    component: Docs,
    hydrate: false,
  },
});
