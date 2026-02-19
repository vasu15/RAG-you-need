'use client';

import { useEffect, useState } from 'react';

export default function IngestPage() {
  const [collectionId, setCollectionId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setCollectionId(localStorage.getItem('activeCollectionId') ?? '');
  }, []);

  const submit = async () => {
    setStatus('Ingesting...');
    const res = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionId, title, sourceType: 'paste', text }),
    });
    const data = await res.json();
    setStatus(res.ok ? `Success doc=${data.docId}, chunks=${data.chunkCount}` : `Error: ${data.error}`);
  };

  return (
    <main className="space-y-3">
      <h1 className="text-xl font-semibold">Ingest</h1>
      <input value={collectionId} onChange={(e) => setCollectionId(e.target.value)} placeholder="Collection ID" className="w-full" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full" />
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste text" className="w-full h-60" />
      <button onClick={submit}>Submit</button>
      <p className="text-sm">{status}</p>
    </main>
  );
}
