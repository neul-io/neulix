export interface BuildManifest {
  [entryName: string]: {
    js?: string;
    css: string;
    imports?: string[];
  };
}

export interface PageConfig<P = unknown> {
  name: string;
  component: React.ComponentType<P>;
  hydrate: boolean;
}

export type PageInput<P = unknown> = Omit<PageConfig<P>, 'name'>;

export interface ScriptTag {
  src?: string;
  content?: string;
  async?: boolean;
  defer?: boolean;
  type?: string;
  id?: string;
}

export interface RenderOptions<P = unknown> {
  props?: P;
  title?: string;
  scripts?: ScriptTag[];
  headScripts?: ScriptTag[];
}

export interface HtmlTemplateOptions {
  appHtml: string;
  scriptTags: string;
  cssTags: string;
  preloadTags?: string;
  title?: string;
  propsJson?: string;
  customScripts?: string;
  customHeadScripts?: string;
}

// Helper to create pages with automatic name inference
export function createPages<T extends Record<string, PageInput>>(input: T): { [K in keyof T]: T[K] & { name: K } } {
  const result = {} as { [K in keyof T]: T[K] & { name: K } };
  for (const key of Object.keys(input) as Array<keyof T>) {
    result[key] = { ...input[key], name: key } as T[keyof T] & { name: keyof T };
  }
  return result;
}
