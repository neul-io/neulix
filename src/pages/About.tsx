import { useState } from 'react';
import Page from '../components/page';

export default function About() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Page>
      <h1>About Page</h1>
      <p>This page is also hydrated with client-side JavaScript.</p>

      <div>
        <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? 'Hide' : 'Show'} Details</button>

        {isOpen && (
          <div>
            <h3>Tech Stack:</h3>
            <ul>
              <li>Bun Runtime</li>
              <li>Express Server</li>
              <li>Vite for Building</li>
              <li>React SSR</li>
              <li>Tailwind CSS</li>
              <li>TypeScript</li>
            </ul>
          </div>
        )}
      </div>
    </Page>
  );
}
