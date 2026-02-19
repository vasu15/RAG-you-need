'use client';

import { useEffect, useState } from 'react';

export default function CollectionsPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState('');

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

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📁 Collections</h1>
          <p className="text-gray-600">
            Organize your documents into collections for better organization and search
          </p>
        </div>

        {/* Create Collection Card */}
        <div className="card mb-8">
          <div className="card-header">Create New Collection</div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Collection Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Company Docs, Research Papers, Meeting Notes..."
                className="w-full"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this collection contains..."
                className="w-full h-20"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>Create Collection</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Collections List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Collections ({collections.length})
          </h2>

          {collections.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">📂</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No collections yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first collection to start organizing documents
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className={`card cursor-pointer transition-all duration-200 ${
                    activeId === col.id
                      ? 'border-blue-500 border-2 bg-blue-50'
                      : 'hover:border-gray-300'
                  }`}
                  onClick={() => handleSetActive(col.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {activeId === col.id ? '📁' : '📂'}
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {col.name}
                          </h3>
                          {col.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {col.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 ml-11">
                        <span>Created {new Date(col.created_at).toLocaleDateString()}</span>
                        {activeId === col.id && (
                          <span className="badge badge-blue">Active</span>
                        )}
                      </div>
                    </div>

                    {activeId === col.id && (
                      <div className="ml-4">
                        <span className="text-blue-600 text-2xl">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 card bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            <span>What are Collections?</span>
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Collections help you organize documents by topic, project, or category</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Each collection has its own search index and configuration settings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>The active collection is used for chat, upload, and search operations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>You can switch between collections at any time</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
