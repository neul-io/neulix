export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white flex gap-4 p-4">
      <a href="/" className="hover:underline">
        Home
      </a>
      <a href="/about" className="hover:underline">
        About
      </a>
      <a href="/docs" className="hover:underline">
        Docs
      </a>
    </nav>
  );
}
