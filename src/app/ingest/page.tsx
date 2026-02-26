'use client';

import { useEffect, useState } from 'react';

export default function IngestPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => {
        setCollections(d.collections || []);
        const activeId = localStorage.getItem('activeCollectionId') ?? '';
        if (activeId) setCollectionId(activeId);
      });
  }, []);

  const handleIngest = async () => {
    if (!collectionId || !title.trim() || !text.trim()) {
      setError('Fill in collection, title, and content');
      return;
    }
    if (text.length < 20) {
      setError('Content must be at least 20 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          title: title.trim(),
          sourceType: 'paste',
          text: text.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Upload failed');

      setSuccess(true);
      setTitle('');
      setText('');
      localStorage.setItem('activeCollectionId', collectionId);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
        if (!title) setTitle(file.name.replace(/\.txt$/i, ''));
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
        if (!title) setTitle(file.name.replace(/\.txt$/i, ''));
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-full p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Upload</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Add a document to a collection</p>
        </header>

        {success && (
          <div className="mb-6 py-3 px-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm fade-in">
            Document added. It will be chunked and embedded.
          </div>
        )}

        {error && (
          <div className="mb-6 py-3 px-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm fade-in">
            {error}
          </div>
        )}

        <div className="card space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Collection</label>
            <select
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                localStorage.setItem('activeCollectionId', e.target.value);
              }}
              className="w-full rounded-xl border-[var(--border)]"
              required
            >
              <option value="">Choose...</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            {collections.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                <a href="/collections" className="text-[var(--accent)] hover:underline">Create a collection</a> first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="w-full rounded-xl border-[var(--border)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Content</label>
            <div
              className={`upload-area ${dragActive ? 'dragging' : ''} mb-3`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept=".txt"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <p className="text-sm text-[var(--text)]">Drop a .txt file or click to browse</p>
              </label>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or paste text here (min 20 characters)"
              className="w-full min-h-[240px] text-sm rounded-xl border-[var(--border)] font-mono"
              required
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {text.length} characters {text.length >= 20 ? '· OK' : ''}
            </p>
          </div>

          <button
            onClick={handleIngest}
            disabled={loading || !collectionId || !title.trim() || text.length < 20}
            className="btn-primary w-full py-2.5 rounded-xl disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" /> Adding...
              </span>
            ) : (
              'Add document'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
