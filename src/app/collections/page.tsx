'use client';

import { useEffect, useState } from 'react';

type Collection = { id: string; name: string; description: string | null };

export default function CollectionsPage() {
  const [items, setItems] = useState<Collection[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState('');

  const load = async () => {
    const res = await fetch('/api/collections');
    const data = await res.json();
    setItems(data.collections ?? []);
  };

  useEffect(() => {
    setActive(localStorage.getItem('activeCollectionId') ?? '');
    load();
  }, []);

  const createCollection = async () => {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) {
      setName('');
      setDescription('');
      load();
    }
  };

  const selectCollection = (id: string) => {
    localStorage.setItem('activeCollectionId', id);
    setActive(id);
  };

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Collections</h1>
      <div className="space-y-2">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
        <button onClick={createCollection}>Create</button>
      </div>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id} className="bg-white p-3 rounded border flex justify-between">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-600">{c.description}</p>
            </div>
            <button onClick={() => selectCollection(c.id)}>{active === c.id ? 'Active' : 'Select'}</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
