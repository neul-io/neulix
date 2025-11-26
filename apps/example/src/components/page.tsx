import Navbar from './navbar';

export default function Page({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Navbar />
      <div className="p-8">{children}</div>
    </div>
  );
}
