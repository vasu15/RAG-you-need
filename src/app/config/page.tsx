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

type GlobalSettings = {
  global_system_prompt: string | null;
  apply_personality_to_all: boolean;
  updated_at?: string;
};

export default function ConfigPage() {
  const [collections, setCollections] = useState<any[]>([]);
  const [collectionId, setCollectionId] = useState('');
  const [config, setConfig] = useState<ConfigType | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    global_system_prompt: null,
    apply_personality_to_all: false,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Single source of truth for the personality prompt in the UI
  const [personalityPrompt, setPersonalityPrompt] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);

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
      .catch((err) => console.error('Failed to load collections:', err));

    fetch('/api/prompts')
      .then((r) => r.json())
      .then((d) => setPromptTemplates(d.templates || []))
      .catch((err) => console.error('Failed to load templates:', err));

    fetch('/api/config/global')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setGlobalSettings(d.settings);
          setApplyToAll(d.settings.apply_personality_to_all ?? false);
          setPersonalityPrompt(d.settings.global_system_prompt ?? '');
        }
      })
      .catch((err) => console.error('Failed to load global settings:', err));
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
        .catch((err) => {
          console.error('Failed to load config:', err);
          setLoading(false);
        });
    }
  }, [collectionId]);

  // When toggle or collection changes, sync textarea from the active source
  useEffect(() => {
    if (applyToAll) {
      setPersonalityPrompt(globalSettings.global_system_prompt ?? '');
    } else if (config?.system_prompt !== undefined) {
      setPersonalityPrompt(config.system_prompt ?? '');
    }
  }, [applyToAll, config?.system_prompt, globalSettings.global_system_prompt]);

  const handleSavePersonality = async () => {
    setLoading(true);
    setSaved(false);
    try {
      if (applyToAll) {
        const res = await fetch('/api/config/global', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            global_system_prompt: personalityPrompt.trim() || null,
            apply_personality_to_all: true,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const data = await res.json();
        if (data.settings) setGlobalSettings(data.settings);
      } else {
        if (!config || !collectionId) return;
        // Save to this collection
        const res = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...config,
            collectionId,
            system_prompt: personalityPrompt.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
        const data = await res.json();
        if (data.config) setConfig(data.config);
        // Ensure global "apply to all" is off so this collection's prompt is used
        await fetch('/api/config/global', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apply_personality_to_all: false }),
        }).then((r) => r.json()).then((d) => d.settings && setGlobalSettings(d.settings)).catch(() => {});
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !collectionId) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, collectionId }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const data = await res.json();
      if (data.config) setConfig(data.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error('Save error:', e);
      alert('Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (key: keyof ConfigType, value: unknown) => {
    if (config) setConfig({ ...config, [key]: value });
  };

  const loadTemplate = (template: PromptTemplate) => {
    setPersonalityPrompt(template.prompt);
  };

  if (!collectionId) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="card max-w-sm text-center">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Choose a collection</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">Select one to configure</p>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              localStorage.setItem('activeCollectionId', e.target.value);
            }}
            className="w-full rounded-xl border-[var(--border)]"
          >
            <option value="">Select...</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (loading && !config) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="card max-w-sm text-center">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Couldn't load</h2>
          <button onClick={() => window.location.reload()} className="btn-primary mt-4 rounded-xl">
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Search and AI for your collection</p>
        </header>

        {saved && (
          <div className="mb-6 py-2.5 px-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm fade-in">
            Saved
          </div>
        )}

        <div className="mb-8">
          <label className="block text-sm font-medium text-[var(--text)] mb-2">Collection</label>
          <select
            value={collectionId}
            onChange={(e) => {
              setCollectionId(e.target.value);
              localStorage.setItem('activeCollectionId', e.target.value);
            }}
            className="w-full rounded-xl border-[var(--border)]"
          >
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {/* Single personality block */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-[var(--text)] mb-2">AI personality</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            How the assistant responds. One prompt; use for all collections or only this one.
          </p>

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
              className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)] w-4 h-4"
            />
            <span className="text-sm font-medium text-[var(--text)]">Use for all collections</span>
          </label>

          {promptTemplates.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-[var(--text-secondary)] mb-2">Templates</p>
              <div className="flex flex-wrap gap-2">
                {promptTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[#f5f5f7] text-[var(--text)] hover:bg-[#e8e8ed]"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={personalityPrompt}
            onChange={(e) => setPersonalityPrompt(e.target.value)}
            placeholder="You are a helpful assistant. Answer using only the provided context. If the context doesn't contain the answer, say so."
            rows={10}
            className="w-full p-4 text-sm rounded-xl border border-[var(--border)] resize-y focus:border-[var(--accent)] font-mono"
          />
          <button
            type="button"
            onClick={handleSavePersonality}
            disabled={loading}
            className="mt-3 btn-primary text-sm px-4 py-2 rounded-xl"
          >
            {loading ? 'Saving...' : 'Save personality'}
          </button>
        </section>

        {/* Search balance */}
        <section className="mb-10">
          <h2 className="text-base font-semibold text-[var(--text)] mb-2">Search balance</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Semantic (meaning) vs keyword (exact). 70% semantic is a good default.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-secondary)] w-14">Keyword</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.w_vec}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateConfig('w_vec', v);
                updateConfig('w_text', parseFloat((1 - v).toFixed(1)));
              }}
              className="flex-1 h-2 rounded-full bg-[var(--border)] appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-secondary)] w-14">Semantic</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {(config.w_vec * 100).toFixed(0)}% semantic · {(config.w_text * 100).toFixed(0)}% keyword
          </p>
        </section>

        {/* Results & model */}
        <section className="mb-10 space-y-6">
          <h2 className="text-base font-semibold text-[var(--text)]">Results & model</h2>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Chunks to use (top_k)</label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={config.top_k}
              onChange={(e) => updateConfig('top_k', parseInt(e.target.value))}
              className="w-full h-2 rounded-full bg-[var(--border)] appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">{config.top_k} chunks</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Minimum score</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.min_score}
              onChange={(e) => updateConfig('min_score', parseFloat(e.target.value))}
              className="w-full h-2 rounded-full bg-[var(--border)] appearance-none cursor-pointer accent-[var(--accent)]"
            />
            <p className="text-xs text-[var(--text-secondary)] mt-1">{config.min_score.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-1">Model</label>
            <select
              value={config.model || 'gpt-3.5-turbo'}
              onChange={(e) => updateConfig('model', e.target.value)}
              className="w-full rounded-xl border-[var(--border)]"
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
            </select>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={loading} className="btn-primary px-6 py-2.5 rounded-xl">
            {loading ? 'Saving...' : 'Save search settings'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset search settings to defaults?')) {
                updateConfig('w_vec', 0.7);
                updateConfig('w_text', 0.3);
                updateConfig('top_k', 8);
                updateConfig('min_score', 0.15);
                updateConfig('model', 'gpt-3.5-turbo');
              }
            }}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)]"
          >
            Reset defaults
          </button>
        </div>
      </div>
    </div>
  );
}
