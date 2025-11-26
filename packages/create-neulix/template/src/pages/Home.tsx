import { useState } from 'react';
import Page from '../components/page';

function BuggyButton() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Test error from BuggyButton!');
  }

  return (
    <button
      className="mt-4 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white p-4 shadow-md rounded-md border"
      onClick={() => setShouldError(true)}
    >
      Click to trigger error
    </button>
  );
}

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <Page>
      <h1>Welcome to Neulix</h1>
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

      <div className="mt-4">
        <h2>Error Boundary Test</h2>
        <BuggyButton />
      </div>
    </Page>
  );
}
