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
      setError('Please fill in all fields');
      return;
    }

    if (text.length < 20) {
      setError('Text must be at least 20 characters long');
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

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to ingest document');
      }

      setSuccess(true);
      setTitle('');
      setText('');
      
      // Auto-set as active collection
      localStorage.setItem('activeCollectionId', collectionId);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
        if (!title) setTitle(file.name.replace('.txt', ''));
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
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setText(event.target?.result as string);
        if (!title) setTitle(file.name.replace('.txt', ''));
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📤 Upload Documents</h1>
          <p className="text-gray-600">
            Add documents to your collection for AI-powered search and answers
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 card bg-green-50 border-green-200 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-900">Document uploaded successfully!</p>
                <p className="text-sm text-green-700">Your document has been chunked and embedded.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 card bg-red-50 border-red-200 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="card">
          {/* Collection Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Select Collection *
            </label>
            <select
              value={collectionId}
              onChange={(e) => {
                setCollectionId(e.target.value);
                localStorage.setItem('activeCollectionId', e.target.value);
              }}
              className="w-full"
              required
            >
              <option value="">Choose a collection...</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  📁 {col.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Don't have a collection? Create one in the <a href="/collections" className="text-blue-600 hover:underline">Collections</a> page.
            </p>
          </div>

          {/* Document Title */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Document Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Company Policy, Research Paper, Meeting Notes..."
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Give your document a descriptive title for easy reference
            </p>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Document Content *
            </label>
            
            {/* Drag & Drop Zone */}
            <div
              className={`upload-area ${dragActive ? 'dragging' : ''} mb-4`}
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
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <span className="text-5xl mb-3">📄</span>
                  <p className="text-gray-700 font-medium mb-1">
                    Drop a .txt file here or click to browse
                  </p>
                  <p className="text-xs text-gray-500">
                    Maximum file size: 10MB
                  </p>
                </div>
              </label>
            </div>

            {/* Text Area */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Or paste your text here... (minimum 20 characters)"
              className="w-full min-h-[300px] font-mono text-sm"
              required
            />
            
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-gray-500">
                Character count: {text.length} {text.length >= 20 ? '✅' : '❌'}
              </p>
              {text.length > 0 && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear text
                </button>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex gap-3">
            <button
              onClick={handleIngest}
              disabled={loading || !collectionId || !title.trim() || text.length < 20}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Upload & Embed Document</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="card bg-blue-50 border-blue-200">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-gray-900 mb-1">Auto-Chunking</h3>
            <p className="text-sm text-gray-600">
              Documents are automatically split into optimized chunks for better search
            </p>
          </div>
          
          <div className="card bg-purple-50 border-purple-200">
            <div className="text-2xl mb-2">🧠</div>
            <h3 className="font-semibold text-gray-900 mb-1">AI Embeddings</h3>
            <p className="text-sm text-gray-600">
              Each chunk is converted to vector embeddings using OpenAI
            </p>
          </div>
          
          <div className="card bg-green-50 border-green-200">
            <div className="text-2xl mb-2">🔍</div>
            <h3 className="font-semibold text-gray-900 mb-1">Hybrid Search</h3>
            <p className="text-sm text-gray-600">
              Combines semantic (vector) and keyword search for best results
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
