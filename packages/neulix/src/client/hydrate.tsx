import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { ErrorBoundary } from '../components/error-boundary';

function getProps<P>(): P | undefined {
  const propsEl = document.getElementById('__PROPS__');
  if (propsEl?.textContent) {
    return JSON.parse(propsEl.textContent) as P;
  }
  return undefined;
}

export function hydrate<P = Record<string, unknown>>(Component: React.ComponentType<P>): void {
  const root = document.getElementById('root');
  if (root) {
    const props = getProps<P>();
    hydrateRoot(
      root,
      <StrictMode>
        <ErrorBoundary>
          <Component {...(props ?? ({} as P))} />
        </ErrorBoundary>
      </StrictMode>
    );
  }
}
