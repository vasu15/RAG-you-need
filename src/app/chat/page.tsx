'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

type Source = {
  chunkId: string;
  documentId: string;
  title: string;
  snippet: string;
  score?: number;
  vecScore?: number;
  textScore?: number;
};

type SearchBreakdown = {
  vectorResults: Array<{ chunkId: string; score: number; content: string; title: string }>;
  textResults:   Array<{ chunkId: string; score: number; content: string; title: string }>;
  merged: Array<{ chunkId: string; finalScore: number; vecScore: number; textScore: number; content: string; title: string }>;
  config: any;
  textSearchRelaxed?: boolean;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  searchBreakdown?: SearchBreakdown;
  timestamp: number;
};

/* ─── Send icon ─────────────────────────────────────────── */
const SendIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 13V3M3 8l5-5 5 5"/>
  </svg>
);

/* ─── Sources panel ─────────────────────────────────────── */
function SourcesPanel({ sources, onOpen }: { sources: Source[]; onOpen: (id: string, title: string, snippet: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors px-0 py-0"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 2h8M2 5h8M2 8h5"/>
        </svg>
        {open ? 'Hide' : 'Show'} {sources.length} source{sources.length !== 1 ? 's' : ''}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5l3 3 3-3"/>
        </svg>
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 fade-in">
          {sources.map((src, i) => (
            <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[#f5f5f7] border border-[var(--border-light)] text-xs">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-[var(--border)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text)] truncate">{src.title}</p>
                <p className="text-[var(--text-secondary)] mt-0.5 line-clamp-2">"{src.snippet}"</p>
                {src.documentId && (
                  <button
                    type="button"
                    onClick={() => onOpen(src.documentId, src.title, src.snippet)}
                    className="mt-1 text-[var(--accent)] hover:underline px-0 py-0 font-normal"
                  >
                    View document →
                  </button>
                )}
              </div>
              {src.score !== undefined && (
                <span className="flex-shrink-0 text-[var(--text-secondary)]">{(src.score * 100).toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Search breakdown panel ────────────────────────────── */
function BreakdownPanel({ breakdown }: { breakdown: SearchBreakdown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors px-0 py-0"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="4"/><path d="M6 4v2.5l1.5 1.5"/>
        </svg>
        Search details
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 3.5l3 3 3-3"/>
        </svg>
      </button>

      {open && breakdown.merged.length > 0 && (
        <div className="mt-2 fade-in">
          <p className="text-[10px] text-[var(--text-secondary)] mb-2">
            Semantic {(breakdown.config.w_vec * 100).toFixed(0)}% · Keyword {(breakdown.config.w_text * 100).toFixed(0)}% · {breakdown.merged.length} chunks
          </p>
          <div className="space-y-1.5">
            {breakdown.merged.slice(0, 4).map((r) => (
              <div key={r.chunkId} className="flex items-center gap-2 text-xs bg-[#f5f5f7] border border-[var(--border-light)] rounded-lg p-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text)] truncate">{r.title}</p>
                  <p className="text-[var(--text-secondary)] line-clamp-1 mt-0.5">{r.content}</p>
                </div>
                <span className="flex-shrink-0 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {(r.finalScore * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {breakdown.merged.length > 4 && (
              <p className="text-xs text-[var(--text-secondary)] pl-1">+{breakdown.merged.length - 4} more chunks</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ChatPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSet, setPhoneSet] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [collections, setCollections] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{
    id: string; title: string; content: string; highlightText: string;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Init ── */
  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhoneNumber');
    if (savedPhone) { setPhoneNumber(savedPhone); setPhoneSet(true); }
    setCollectionId(localStorage.getItem('activeCollectionId') ?? '');
    fetch('/api/collections')
      .then(r => r.json())
      .then(d => setCollections(d.collections || []));
  }, []);

  /* ── Load history ── */
  const loadConversationHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          timestamp: new Date(m.created_at).getTime(),
        })));
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [phoneNumber, collectionId]);

  useEffect(() => {
    if (phoneNumber && collectionId && phoneSet) loadConversationHistory();
  }, [phoneNumber, collectionId, phoneSet, loadConversationHistory]);

  /* ── Scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Save message ── */
  const saveMessage = async (msg: Message) => {
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber, collectionId,
          role: msg.role, content: msg.content, sources: msg.sources,
        }),
      });
    } catch { /* silent */ }
  };

  /* ── Open document viewer ── */
  const openDocument = async (documentId: string, title: string, highlightText: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      const data = await res.json();
      if (data.document) setViewingDocument({ id: documentId, title, content: data.document.fullContent, highlightText });
    } catch { /* silent */ }
  };

  /* ── Phone setup ── */
  const handleSetPhone = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter at least 10 digits.');
      return;
    }
    setPhoneError('');
    localStorage.setItem('userPhoneNumber', phoneNumber);
    setPhoneSet(true);
  };

  /* ── Clear chat ── */
  const handleClearChat = async () => {
    const url = `/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`;
    try { await fetch(url, { method: 'DELETE' }); } catch { /* silent */ }
    setMessages([]);
    setConfirmClear(false);
  };

  /* ── Change phone (sign out) ── */
  const handleChangePhone = () => {
    setPhoneSet(false);
    setMessages([]);
    setPhoneNumber('');
    localStorage.removeItem('userPhoneNumber');
  };

  /* ── Switch collection (instant, no confirm — non-destructive) ── */
  const handleCollectionChange = (newId: string) => {
    setCollectionId(newId);
    localStorage.setItem('activeCollectionId', newId);
    setMessages([]);
  };

  /* ── Auto-resize textarea ── */
  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px';
  };

  /* ── Send message ── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || !collectionId || !phoneNumber || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    await saveMessage(userMsg);

    try {
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          query: userMsg.content,
          debug: true,
          previousMessages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }

      const answerText =
        data?.answer?.trim()
          ? data.answer.trim()
          : !res.ok
            ? `Something went wrong (${res.status}). Please try again.`
            : 'No answer could be generated from the documents.';

      const sources: Source[] = data?.citations ?? [];
      const sd = data?.search;
      const breakdown: SearchBreakdown | undefined = sd?.debug ? {
        vectorResults: sd.debug.vectorCandidates || [],
        textResults:   sd.debug.textCandidates  || [],
        merged: (sd.results || []).map((r: any) => ({
          chunkId: r.chunkId,
          finalScore: r.finalScore,
          vecScore: r.vecScoreNorm,
          textScore: r.textScoreNorm,
          content: r.content,
          title: r.document?.title,
        })),
        config: sd.debug.config,
        textSearchRelaxed: sd.debug.textSearchRelaxed === true,
      } : undefined;

      const assistantMsg: Message = {
        id: `a-${Date.now()}`, role: 'assistant',
        content: answerText, sources, searchBreakdown: breakdown,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (res.ok) await saveMessage(assistantMsg);

    } catch {
      setMessages(prev => [...prev, {
        id: `e-${Date.now()}`, role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Onboarding screen ─────────────────────────────────── */
  if (!phoneSet) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 bg-[var(--bg)]">
        <div className="w-full max-w-[320px]">
          {/* Icon */}
          <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-center text-[var(--text)] mb-1.5">Welcome</h1>
          <p className="text-[14px] text-center text-[var(--text-secondary)] mb-8 leading-snug">
            Enter your number to keep your<br />conversation history private.
          </p>

          <div className="space-y-3">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, '')); setPhoneError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPhone()}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3 rounded-xl text-[15px]"
              autoFocus
            />
            {phoneError && (
              <p className="text-xs text-red-500 px-1">{phoneError}</p>
            )}
            <button
              onClick={handleSetPhone}
              disabled={!phoneNumber.trim()}
              className="btn-primary w-full rounded-xl py-3 text-[15px]"
            >
              Continue
            </button>
          </div>

          <p className="text-[11px] text-center text-[var(--text-secondary)] mt-6 leading-relaxed">
            No SMS sent · No verification required
          </p>
        </div>
      </div>
    );
  }

  /* ── Active collection name ── */
  const activeCollection = collections.find(c => c.id === collectionId);

  /* ── Main chat UI ──────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">

      {/* Header */}
      <header className="flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-4">
        <div className="flex items-center justify-between h-12 max-w-3xl mx-auto">

          {/* Collection selector */}
          <select
            value={collectionId}
            onChange={(e) => handleCollectionChange(e.target.value)}
            className="text-[13.5px] font-medium text-[var(--text)] border-0 bg-transparent pl-0 py-0 focus:shadow-none focus:ring-0 cursor-pointer max-w-[200px] truncate"
            style={{ boxShadow: 'none' }}
          >
            <option value="">Select collection…</option>
            {collections.map(col => (
              <option key={col.id} value={col.id}>{col.name}</option>
            ))}
          </select>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-[var(--text-secondary)]">Clear history?</span>
                  <button
                    type="button" onClick={handleClearChat}
                    className="text-[12px] text-red-500 font-semibold px-2 py-1 rounded-md hover:bg-red-50"
                  >Yes</button>
                  <button
                    type="button" onClick={() => setConfirmClear(false)}
                    className="text-[12px] text-[var(--text-secondary)] px-2 py-1 rounded-md hover:bg-[#f0f0f5]"
                  >No</button>
                </div>
              ) : (
                <button
                  type="button" onClick={() => setConfirmClear(true)}
                  className="text-[12px] text-[var(--text-secondary)] px-2.5 py-1.5 rounded-lg hover:bg-[#f0f0f5]"
                >
                  Clear
                </button>
              )
            )}

            {/* User avatar — shows last 2 digits, click to change */}
            <button
              type="button"
              onClick={handleChangePhone}
              title={`Signed in as ${phoneNumber}\nClick to change`}
              className="w-7 h-7 rounded-full bg-[#e8e8ed] flex items-center justify-center text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[#d8d8de] transition-colors flex-shrink-0"
            >
              {phoneNumber.replace(/\D/g, '').slice(-2) || '?'}
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>

        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-10 h-10 rounded-xl bg-[#e8e8ed] flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="7"/><path d="M9 5v5l3 2"/>
              </svg>
            </div>
            <h2 className="text-[17px] font-semibold text-[var(--text)] mb-1">
              {collectionId ? `Ask about ${activeCollection?.name ?? 'this collection'}` : 'Choose a collection'}
            </h2>
            <p className="text-[13.5px] text-[var(--text-secondary)] mb-6 max-w-xs leading-snug">
              {collectionId
                ? 'Answers come directly from your documents.'
                : 'Select a collection from the top to start chatting.'}
            </p>
            {collectionId && (
              <div className="flex flex-wrap gap-2 justify-center">
                {['What is this collection about?', 'Summarize the key points', 'What are the main topics?'].map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3.5 py-2 rounded-xl text-[13px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[#eeeef0] transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

        ) : (
          /* Message thread */
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
            {messages.map((msg) => (
              <div key={msg.id} className="fade-in">
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="flex justify-end">
                    <div className="message-user">
                      <p className="text-[15px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant — no bubble, flowing text */
                  <div className="max-w-[88%]">
                    <p className="text-[15px] leading-[1.75] text-[var(--text)] whitespace-pre-wrap">
                      {msg.content || '\u00A0'}
                    </p>
                    {msg.sources && msg.sources.length > 0 && (
                      <SourcesPanel sources={msg.sources} onOpen={openDocument} />
                    )}
                    {msg.searchBreakdown && (
                      <BreakdownPanel breakdown={msg.searchBreakdown} />
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="fade-in">
                <div className="flex gap-1.5 items-center py-2">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-[var(--surface)] border-t border-[var(--border)] px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div
            className={`flex items-end gap-2 px-3 py-2 rounded-2xl border transition-all ${
              collectionId
                ? 'border-[var(--border)] bg-white focus-within:border-[var(--accent)] focus-within:shadow-[0_0_0_3px_rgba(0,113,227,0.12)]'
                : 'border-[var(--border-light)] bg-[#f0f0f5]'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder={collectionId ? 'Ask a question…' : 'Select a collection first'}
              disabled={!collectionId || loading || loadingHistory}
              rows={1}
              className="flex-1 resize-none border-0 bg-transparent text-[15px] leading-relaxed py-1 px-0 outline-none focus:ring-0 focus:shadow-none disabled:opacity-50 min-h-[26px] max-h-[180px] overflow-y-auto"
              style={{ boxShadow: 'none' }}
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || !collectionId || loading || loadingHistory}
              className="flex-shrink-0 w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center disabled:opacity-30 transition-opacity mb-0.5"
            >
              {loading ? <div className="spinner" style={{ width: '13px', height: '13px', borderWidth: '1.5px' }} /> : <SendIcon />}
            </button>
          </div>
          <p className="text-[11px] text-center text-[var(--text-secondary)] mt-1.5 opacity-60">
            Return to send · Shift+Return for new line
          </p>
        </div>
      </div>

      {/* Document viewer modal */}
      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 fade-in"
          onClick={() => setViewingDocument(null)}
        >
          <div
            className="bg-[var(--surface)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[82vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-[var(--text)] truncate pr-4">{viewingDocument.title}</h2>
              <button
                onClick={() => setViewingDocument(null)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[#f0f0f5] text-[var(--text-secondary)] hover:text-[var(--text)] text-lg leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose max-w-none">
                {viewingDocument.content.split('\n\n').map((para, i) => (
                  <p
                    key={i}
                    className={`mb-4 ${
                      para.includes(viewingDocument.highlightText)
                        ? 'bg-amber-50 border-l-2 border-amber-400 pl-3 py-1 rounded-r'
                        : ''
                    }`}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
