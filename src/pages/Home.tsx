import { useState } from 'react';
import Page from '../components/page';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <Page>
      <h1>Welcome to Bun + Vite SSR</h1>
      <p>This page is hydrated with client-side JavaScript.</p>

      <div>
        <h2>Interactive counter</h2>
        <button
          className="mt-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white p-4 shadow-md rounded-md border"
          onClick={() => setCount(c => c + 1)}
        >
          Count: {count}
        </button>
      </div>
    </Page>
  );
}
