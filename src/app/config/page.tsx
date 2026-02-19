'use client';

import { useEffect, useState } from 'react';

type Cfg = {
  w_vec: number; w_text: number; top_k: number; vec_candidates: number; text_candidates: number;
  recency_boost: boolean; recency_lambda: number; min_score: number;
};

export default function ConfigPage() {
  const [collectionId, setCollectionId] = useState('');
  const [cfg, setCfg] = useState<Cfg>({
    w_vec: 0.7, w_text: 0.3, top_k: 8, vec_candidates: 30, text_candidates: 30,
    recency_boost: false, recency_lambda: 0.02, min_score: 0.15,
  });

  useEffect(() => {
    const id = localStorage.getItem('activeCollectionId') ?? '';
    setCollectionId(id);
    if (!id) return;
    fetch(`/api/config?collectionId=${id}`).then((r) => r.json()).then((d) => d.config && setCfg(d.config));
  }, []);

  const save = async () => {
    const payload = { ...cfg, collectionId, w_text: 1 - cfg.w_vec };
    await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  return (
    <main className="space-y-3">
      <h1 className="text-xl font-semibold">Config</h1>
      <p className="text-sm">Collection: {collectionId || 'none selected'}</p>
      <label className="block">w_vec: {cfg.w_vec.toFixed(2)}</label>
      <input type="range" min={0} max={1} step={0.01} value={cfg.w_vec}
        onChange={(e) => setCfg((c) => ({ ...c, w_vec: Number(e.target.value), w_text: 1 - Number(e.target.value) }))} className="w-full" />
      <p>w_text (auto): {(1 - cfg.w_vec).toFixed(2)}</p>
      <input type="number" value={cfg.top_k} onChange={(e) => setCfg((c) => ({ ...c, top_k: Number(e.target.value) }))} placeholder="top_k" />
      <input type="number" value={cfg.vec_candidates} onChange={(e) => setCfg((c) => ({ ...c, vec_candidates: Number(e.target.value) }))} placeholder="vec candidates" />
      <input type="number" value={cfg.text_candidates} onChange={(e) => setCfg((c) => ({ ...c, text_candidates: Number(e.target.value) }))} placeholder="text candidates" />
      <label className="flex gap-2 items-center"><input type="checkbox" checked={cfg.recency_boost} onChange={(e) => setCfg((c) => ({ ...c, recency_boost: e.target.checked }))} />Recency boost</label>
      <input type="number" step="0.01" value={cfg.recency_lambda} onChange={(e) => setCfg((c) => ({ ...c, recency_lambda: Number(e.target.value) }))} placeholder="recency lambda" />
      <input type="number" step="0.01" value={cfg.min_score} onChange={(e) => setCfg((c) => ({ ...c, min_score: Number(e.target.value) }))} placeholder="min score" />
      <button onClick={save}>Save</button>
    </main>
  );
}
