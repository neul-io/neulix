import { createPages } from 'neulix';
import Docs from './Docs';
import Home from './Home';

export const pages = createPages({
  Home: {
    component: Home,
    hydrate: true,
  },
  Docs: {
    component: Docs,
    hydrate: false,
  },
});
