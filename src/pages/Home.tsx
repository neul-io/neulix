import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="home-container">
      <h1 className="text-4xl font-bold text-blue-600 mb-4">Welcome to Bun + Vite SSR</h1>
      <p className="text-gray-700 mb-6">This page is hydrated with client-side JavaScript.</p>

      <div className="card bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Interactive counter</h2>
        <button
          onClick={() => setCount(c => c + 1)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          Count: {count}
        </button>
      </div>

      <nav className="mt-8">
        <a href="/about" className="text-blue-500 hover:underline mr-4">
          About (Hydrated)
        </a>
        <a href="/docs" className="text-blue-500 hover:underline">
          Docs (Static)
        </a>
      </nav>
    </div>
  );
}
