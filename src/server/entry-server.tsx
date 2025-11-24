import { renderToString } from 'react-dom/server';
import type { PageConfig } from '../types';

export function render(pageConfig: PageConfig): string {
  const Component = pageConfig.component;
  return renderToString(<Component />);
}
