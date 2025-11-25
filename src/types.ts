export interface ManifestChunk {
  file: string;
  src?: string;
  css?: string[];
  assets?: string[];
  isEntry?: boolean;
  name?: string;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}

export interface PageManifest {
  [key: string]: ManifestChunk;
}

export interface PageConfig {
  component: React.ComponentType;
  entryName: string;
  hydrate: boolean;
}
