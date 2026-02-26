'use client';

import { useEffect, useState } from 'react';

type Document = {
  id: string;
  title: string;
  source_type: string;
  source_ref: string | null;
  created_at: string;
  chunkCount: number;
  embeddingCount: number;
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [backfillStatus, setBackfillStatus] = useState<{ [id: string]: 'idle' | 'loading' | 'done' | 'error' }>({});
  const [backfillResult, setBackfillResult] = useState<{ [id: string]: string }>({});
  const [expandedDocs, setExpandedDocs] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{ [collectionId: string]: Document[] }>({});
  const [docsLoading, setDocsLoading] = useState<{ [id: string]: boolean }>({});

  const loadCollections = () => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => {
        setCollections(d.collections || []);
        const stored = localStorage.getItem('activeCollectionId') ?? '';
        if (stored && d.collections?.some((c: any) => c.id === stored)) {
          setActiveId(stored);
        }
      });
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);

    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });

      const data = await res.json();
      if (data.collection) {
        setActiveId(data.collection.id);
        localStorage.setItem('activeCollectionId', data.collection.id);
        setName('');
        setDescription('');
        loadCollections();
      }
    } catch (error) {
      console.error('Create error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = (id: string) => {
    setActiveId(id);
    localStorage.setItem('activeCollectionId', id);
  };

  const handleBackfill = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation(); // don't trigger setActive
    setBackfillStatus((s) => ({ ...s, [collectionId]: 'loading' }));
    setBackfillResult((r) => ({ ...r, [collectionId]: '' }));
    try {
      const res = await fetch('/api/embeddings/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Backfill failed');
      setBackfillStatus((s) => ({ ...s, [collectionId]: 'done' }));
      setBackfillResult((r) => ({ ...r, [collectionId]: data.message }));
    } catch (err: any) {
      setBackfillStatus((s) => ({ ...s, [collectionId]: 'error' }));
      setBackfillResult((r) => ({ ...r, [collectionId]: err.message }));
    }
  };

  const handleToggleDocs = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    if (expandedDocs === collectionId) {
      setExpandedDocs(null);
      return;
    }
    setExpandedDocs(collectionId);
    if (documents[collectionId]) return; // already loaded

    setDocsLoading((d) => ({ ...d, [collectionId]: true }));
    try {
      const res = await fetch(`/api/documents?collectionId=${collectionId}`);
      const data = await res.json();
      setDocuments((d) => ({ ...d, [collectionId]: data.documents ?? [] }));
    } catch {
      setDocuments((d) => ({ ...d, [collectionId]: [] }));
    } finally {
      setDocsLoading((d) => ({ ...d, [collectionId]: false }));
    }
  };

  return (
    <div className="min-h-full p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Collections</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Organize documents; each has its own search and settings</p>
        </header>

        <div className="card mb-8">
          <h2 className="text-base font-semibold text-[var(--text)] mb-4">New collection</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Company docs"
                className="w-full rounded-xl border-[var(--border)]"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Description (optional)</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="w-full rounded-xl border-[var(--border)]"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="btn-primary w-full py-2.5 rounded-xl disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2"><span className="spinner" /> Creating...</span>
              ) : (
                'Create'
              )}
            </button>
          </div>
        </div>

        <h2 className="text-base font-semibold text-[var(--text)] mb-4">
          Your collections {collections.length > 0 && `(${collections.length})`}
        </h2>

          {collections.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="text-[var(--text-secondary)] text-sm">No collections yet. Create one above, then add documents from Upload.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={`card cursor-pointer transition-colors ${
                    activeId === col.id ? 'border-[var(--accent)] border-2 bg-[rgba(0,113,227,0.04)]' : 'hover:border-[#adadad]'
                  }`}
                  onClick={() => handleSetActive(col.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-[var(--text)]">{col.name}</h3>
                      {col.description && (
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5">{col.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-[var(--text-secondary)]">
                        {activeId === col.id && (
                          <span className="badge badge-blue">Active</span>
                        )}
                        <span>{new Date(col.created_at).toLocaleDateString()}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={(e) => handleToggleDocs(e, col.id)}
                          className="text-sm text-[var(--accent)] hover:underline"
                        >
                          {expandedDocs === col.id ? 'Hide' : 'Show'} documents
                        </button>
                        <button
                          onClick={(e) => handleBackfill(e, col.id)}
                          disabled={backfillStatus[col.id] === 'loading'}
                          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] disabled:opacity-50"
                        >
                          {backfillStatus[col.id] === 'loading' ? 'Generating…' : 'Generate embeddings'}
                        </button>
                        {backfillResult[col.id] && (
                          <span className={`text-xs ${backfillStatus[col.id] === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                            {backfillResult[col.id]}
                          </span>
                        )}
                      </div>

                      {expandedDocs === col.id && (
                        <div className="mt-4 pt-4 border-t border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
                          {docsLoading[col.id] ? (
                            <p className="text-sm text-[var(--text-secondary)]">Loading…</p>
                          ) : !documents[col.id]?.length ? (
                            <p className="text-sm text-[var(--text-secondary)]">
                              No documents. <a href="/ingest" className="text-[var(--accent)] hover:underline">Upload</a> to add.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {documents[col.id].map((doc) => (
                                <li
                                  key={doc.id}
                                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#fafafa] border border-[var(--border)] text-sm"
                                >
                                  <span className="font-medium text-[var(--text)] truncate">{doc.title}</span>
                                  <span className="text-xs text-[var(--text-secondary)] flex-shrink-0 ml-2">
                                    {doc.chunkCount} chunks · {doc.embeddingCount === doc.chunkCount && doc.chunkCount > 0 ? 'Embedded' : `${doc.embeddingCount}/${doc.chunkCount}`}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    {activeId === col.id && (
                      <span className="text-[var(--accent)] text-lg flex-shrink-0">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        <p className="mt-8 text-xs text-[var(--text-secondary)]">
          The active collection is used for Chat, Upload, and Settings.
        </p>
      </div>
    </div>
  );
}
