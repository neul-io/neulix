import { hydrateRoot } from 'react-dom/client';
import { getPageConfigAsync } from '../pages/registry';
import '../styles/global.css';

const path = window.location.pathname;
const pageConfig = getPageConfigAsync(path);

if (pageConfig && pageConfig.hydrate) {
  pageConfig.componentLoader().then(module => {
    const Component = module.default;
    const root = document.getElementById('root');

    if (root) {
      hydrateRoot(root, <Component />);
    }
  });
}
