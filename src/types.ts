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
  url: string;
  hydrate: boolean;
}

export interface RenderOptions<P = unknown> {
  props?: P;
  title?: string;
}
