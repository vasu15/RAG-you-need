import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Hybrid RAG App</h1>
      <p className="text-sm text-gray-700">Use collections, ingest docs, tune config, then chat/search.</p>
      <nav className="flex gap-3 flex-wrap">
        <Link href="/collections" className="underline">Collections</Link>
        <Link href="/ingest" className="underline">Ingest</Link>
        <Link href="/config" className="underline">Config</Link>
        <Link href="/chat" className="underline">Chat</Link>
      </nav>
    </main>
  );
}
