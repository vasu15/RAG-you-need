'use client';

import { useEffect, useState } from 'react';

type ConfigType = {
  collection_id: string;
  w_vec: number;
  w_text: number;
  top_k: number;
  vec_candidates: number;
  text_candidates: number;
  recency_boost: boolean;
  recency_lambda: number;
  min_score: number;
  system_prompt?: string;
  model?: string;
  updated_at: string;
};

type PromptTemplate = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  is_default: boolean;
};

export default function ConfigPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [config, setConfig] = useState<ConfigType | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  useEffect(() => {
    fetch('/api/collections')
      .then((r) => r.json())
      .then((d) => {
        setCollections(d.collections || []);
        const activeId = localStorage.getItem('activeCollectionId') ?? '';
        if (activeId && d.collections?.some((c: any) => c.id === activeId)) {
          setCollectionId(activeId);
        }
      })
      .catch(err => console.error('Failed to load collections:', err));

    // Load prompt templates
    fetch('/api/prompts')
      .then((r) => r.json())
      .then((d) => setPromptTemplates(d.templates || []))
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  useEffect(() => {
    if (collectionId) {
      setLoading(true);
      fetch(`/api/config?collectionId=${collectionId}`)
        .then((r) => r.json())
        .then((d) => {
          setConfig(d.config);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load config:', err);
          setLoading(false);
        });
    }
  }, [collectionId]);

  const handleSave = async () => {
    if (!config || !collectionId) return;
    setLoading(true);
    setSaved(false);

    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, collectionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save settings. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof ConfigType, value: any) => {
    if (config) {
      setConfig({ ...config, [key]: value });
    }
  };

  const loadTemplate = (template: PromptTemplate) => {
    if (config) {
      setConfig({ ...config, system_prompt: template.prompt });
    }
  };

  if (!collectionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Collection</h2>
          <p className="text-gray-600 mb-6">Choose a collection to configure its settings</p>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              localStorage.setItem('activeCollectionId', e.target.value);
            }}
            className="w-full"
          >
            <option value="">Select a collection...</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                📁 {col.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (loading && !config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-3"></div>
          <p className="text-gray-600">Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="card max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-6">Could not load configuration. Please try again.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">⚙️ Search Settings</h1>
          <p className="text-gray-600">
            Fine-tune how hybrid search and AI responses work for your collection
          </p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 card bg-green-50 border-green-200 fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-900">Settings saved!</p>
                <p className="text-sm text-green-700">Your changes are now active.</p>
              </div>
            </div>
          </div>
        )}

        {/* Collection Selector */}
        <div className="card mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Collection
          </label>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              localStorage.setItem('activeCollectionId', e.target.value);
            }}
            className="w-full"
          >
            <option value="">Select a collection...</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                📁 {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI System Prompt */}
        <div className="card mb-6">
          <div className="card-header flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>🤖</span>
              <span>AI Assistant Personality</span>
            </div>
            <button
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="btn-secondary text-sm px-3 py-1"
            >
              {showPromptEditor ? 'Hide' : 'Customize'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Define how the AI assistant responds to questions
          </p>

          {showPromptEditor && (
            <div className="space-y-4 fade-in">
              {/* Quick Templates */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Quick Templates
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {promptTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => loadTemplate(template)}
                      className="btn-secondary text-left p-3 text-sm"
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt Editor */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Custom System Prompt
                </label>
                <textarea
                  value={config.system_prompt || ''}
                  onChange={(e) => updateConfig('system_prompt', e.target.value)}
                  placeholder="You are a helpful AI assistant..."
                  className="w-full h-32 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This prompt defines the AI's behavior and response style. Be specific about tone, format, and approach.
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  OpenAI Model
                </label>
                <select
                  value={config.model || 'gpt-3.5-turbo'}
                  onChange={(e) => updateConfig('model', e.target.value)}
                  className="w-full"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast, Cost-effective)</option>
                  <option value="gpt-4">GPT-4 (Most capable, Higher cost)</option>
                  <option value="gpt-4-turbo-preview">GPT-4 Turbo (Balanced)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Search Balance */}
        <div className="card mb-6">
          <div className="card-header flex items-center gap-2">
            <span>🎯</span>
            <span>Search Balance</span>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Control how much weight is given to AI semantic search vs. traditional keyword search
          </p>

          <div className="space-y-6">
            {/* Vector Weight */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-900">
                  🧠 AI Semantic Search Weight
                </label>
                <span className="badge badge-blue">{(config.w_vec * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.w_vec}
                onChange={(e) => {
                  const newVec = parseFloat(e.target.value);
                  updateConfig('w_vec', newVec);
                  updateConfig('w_text', parseFloat((1 - newVec).toFixed(1)));
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = More focus on meaning and context (understands "car" and "automobile" are similar)
              </p>
            </div>

            {/* Text Weight */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-900">
                  📝 Keyword Search Weight
                </label>
                <span className="badge badge-green">{(config.w_text * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.w_text}
                onChange={(e) => {
                  const newText = parseFloat(e.target.value);
                  updateConfig('w_text', newText);
                  updateConfig('w_vec', parseFloat((1 - newText).toFixed(1)));
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = More focus on exact word matches (finds "OpenAI" when you search "OpenAI")
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-gray-700">
              💡 <strong>Tip:</strong> Start with 70% AI / 30% Keyword for balanced results. Increase AI weight for conceptual questions, increase Keyword weight for specific terms.
            </p>
          </div>
        </div>

        {/* Results Settings */}
        <div className="card mb-6">
          <div className="card-header flex items-center gap-2">
            <span>📊</span>
            <span>Results & Performance</span>
          </div>

          <div className="space-y-6">
            {/* Top K */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Number of Results (top_k): <span className="badge badge-gray">{config.top_k}</span>
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={config.top_k}
                onChange={(e) => updateConfig('top_k', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                How many relevant chunks to return in search results
              </p>
            </div>

            {/* Min Score */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Minimum Relevance Score: <span className="badge badge-gray">{config.min_score.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.min_score}
                onChange={(e) => updateConfig('min_score', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Filter out results below this relevance threshold (0 = show all, 1 = only perfect matches)
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Save Settings</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                setConfig({
                  ...config,
                  w_vec: 0.7,
                  w_text: 0.3,
                  top_k: 8,
                  min_score: 0.15,
                  system_prompt: 'You are a helpful AI assistant. Answer the user\'s question based on the provided context. Be concise and accurate. If the context doesn\'t contain relevant information, say so.',
                  model: 'gpt-3.5-turbo',
                });
              }
            }}
            className="btn-secondary"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
