'use client';

import { useEffect, useState } from 'react';

export default function ChatPage() {
  const [collectionId, setCollectionId] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [answer, setAnswer] = useState<any>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setCollectionId(localStorage.getItem('activeCollectionId') ?? '');
  }, []);

  const search = async () => {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, query, debug }),
    });
    setData(await res.json());
  };

  const ask = async () => {
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, query, debug }),
    });
    setAnswer(await res.json());
  };

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Chat</h1>
      <p className="text-sm">Collection: {collectionId || 'none selected'}</p>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask something" className="w-full" />
      <label className="flex gap-2 items-center"><input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />Debug</label>
      <div className="flex gap-2"><button onClick={search}>Search</button><button onClick={ask}>Answer</button></div>
      {answer && (
        <section className="bg-white p-3 border rounded">
          <h2 className="font-medium">Answer</h2>
          <p>{answer.answer}</p>
          <ul className="list-disc pl-5 text-sm">
            {answer.citations?.map((c: any) => (<li key={c.chunkId}>{c.title}: {c.snippet}</li>))}
          </ul>
        </section>
      )}
      <section className="space-y-2">
        {data?.results?.map((r: any) => (
          <article key={r.chunkId} className="bg-white p-3 rounded border">
            <p className="text-sm">{r.document?.title} • final {r.finalScore.toFixed(3)} • vec {r.vecScoreNorm.toFixed(3)} • text {r.textScoreNorm.toFixed(3)}</p>
            <p>{r.content.slice(0, 350)}...</p>
          </article>
        ))}
      </section>
      {debug && data?.debug && <pre className="bg-gray-100 p-3 text-xs overflow-auto">{JSON.stringify(data.debug, null, 2)}</pre>}
    </main>
  );
}
