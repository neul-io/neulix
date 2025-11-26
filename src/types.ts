export interface BuildManifest {
  [entryName: string]: {
    js?: string;
    css: string;
    imports?: string[];
  };
}

export interface PageConfig {
  component: React.ComponentType;
  url: string;
  hydrate: boolean;
}
