import type { PageConfig } from '../types';
import Home from './Home';
import About from './About';
import Docs from './Docs';

type PageInput = Omit<PageConfig, 'name'>;

function createPages<T extends Record<string, PageInput>>(
  input: T
): { [K in keyof T]: T[K] & { name: K } } {
  const result = {} as { [K in keyof T]: T[K] & { name: K } };
  for (const key of Object.keys(input) as Array<keyof T>) {
    result[key] = { ...input[key], name: key } as T[keyof T] & { name: keyof T };
  }
  return result;
}

export const pages = createPages({
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
});
