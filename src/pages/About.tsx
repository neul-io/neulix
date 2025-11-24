import { useState } from 'react';

export default function About() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="about-container">
      <h1 className="text-4xl font-bold text-green-600 mb-4">About Page</h1>
      <p className="text-gray-700 mb-6">This page is also hydrated with client-side JavaScript.</p>

      <div className="bg-green-100 p-6 rounded-lg">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          {isOpen ? 'Hide' : 'Show'} Details
        </button>

        {isOpen && (
          <div className="mt-4 p-4 bg-white rounded shadow">
            <h3 className="font-semibold text-lg mb-2">Tech Stack:</h3>
            <ul className="list-disc list-inside text-gray-700">
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

      <nav className="mt-8">
        <a href="/" className="text-blue-500 hover:underline mr-4">
          Home
        </a>
        <a href="/docs" className="text-blue-500 hover:underline">
          Docs (Static)
        </a>
      </nav>
    </div>
  );
}
