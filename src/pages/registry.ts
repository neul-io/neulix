import type { PageConfig } from '../types';
import About from './About';
import Docs from './Docs';
import Home from './Home';

type PageInput = Omit<PageConfig, 'name'>;

function createPages<T extends Record<string, PageInput>>(input: T): { [K in keyof T]: T[K] & { name: K } } {
  const result = {} as { [K in keyof T]: T[K] & { name: K } };
  for (const key of Object.keys(input) as Array<keyof T>) {
    result[key] = { ...input[key], name: key } as T[keyof T] & { name: keyof T };
  }
  return result;
}

export const pages = createPages({
  home: {
    component: Home,
    hydrate: true,
  },
  about: {
    component: About,
    hydrate: true,
  },
  docs: {
    component: Docs,
    hydrate: false,
  },
});
