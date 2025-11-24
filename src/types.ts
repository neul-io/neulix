export interface PageManifest {
  [key: string]: {
    file: string;
    css?: string[];
    imports?: string[];
  };
}

export interface RenderOptions {
  hydrate?: boolean;
  path: string;
}

export interface PageConfig {
  component: React.ComponentType;
  hydrate: boolean;
  componentPath?: string;
}

export interface PageConfigAsync {
  componentLoader: () => Promise<{ default: React.ComponentType }>;
  hydrate: boolean;
  componentPath: string;
}
