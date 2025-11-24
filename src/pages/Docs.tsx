export default function Docs() {
  return (
    <div className="docs-container">
      <h1 className="text-4xl font-bold text-purple-600 mb-4">Documentation</h1>
      <p className="text-gray-700 mb-6">
        This page is <strong>NOT hydrated</strong>. It&apos;s pure SSR HTML with no client-side
        JavaScript.
      </p>

      <article className="prose max-w-none">
        <section className="mb-8 bg-purple-50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-3 text-purple-800">Getting Started</h2>
          <p className="text-gray-700 mb-4">
            This is a static documentation page. Since it doesn&apos;t require any interactivity,
            we&apos;ve disabled hydration to save bandwidth and improve performance.
          </p>
          <p className="text-gray-700">
            No JavaScript is loaded for this page, making it lightning fast!
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Features</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Server-Side Rendering with React</li>
            <li>Optional client-side hydration per page</li>
            <li>Code splitting per route</li>
            <li>Tailwind CSS with purging</li>
            <li>Hot restart on file changes</li>
            <li>Production and development modes</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Page Configuration</h2>
          <p className="text-gray-700 mb-4">
            Each page in the registry can specify whether it needs hydration:
          </p>
          <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
            {`{
  '/': { component: Home, hydrate: true },
  '/docs': { component: Docs, hydrate: false }
}`}
          </pre>
        </section>
      </article>

      <nav className="mt-8">
        <a href="/" className="text-blue-500 hover:underline mr-4">
          Home
        </a>
        <a href="/about" className="text-blue-500 hover:underline">
          About
        </a>
      </nav>
    </div>
  );
}
