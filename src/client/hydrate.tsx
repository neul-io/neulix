import 'vite/modulepreload-polyfill';
import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';

export function hydrate(Component: React.ComponentType): void {
  const root = document.getElementById('root');
  if (root) {
    hydrateRoot(
      root,
      <StrictMode>
        <Component />
      </StrictMode>
    );
  }
}
