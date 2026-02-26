'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

/* ─── Types ──────────────────────────────────────────────────────── */
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

/* ─── Message group helpers ──────────────────────────────────────── */
function getGroupInfo(msgs: Message[], idx: number) {
  const cur  = msgs[idx];
  const prev = msgs[idx - 1];
  const next = msgs[idx + 1];
  return {
    isFirst: !prev || prev.role !== cur.role,
    isLast:  !next || next.role !== cur.role,
  };
}

function shouldShowTimestamp(msgs: Message[], idx: number): boolean {
  if (idx === 0) return true;
  return msgs[idx].timestamp - msgs[idx - 1].timestamp > 60 * 60 * 1000;
}

function formatTimestamp(ts: number): string {
  const d   = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today ${time}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ` ${time}`;
}

/* ─── Icons ──────────────────────────────────────────────────────── */
const BotIcon = () => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#8E8E93" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="14" height="10" rx="3"/>
    <path d="M7 7V5a3 3 0 0 1 6 0v2"/>
    <circle cx="7.5" cy="12" r="1.1" fill="#8E8E93" stroke="none"/>
    <circle cx="12.5" cy="12" r="1.1" fill="#8E8E93" stroke="none"/>
  </svg>
);

const ArrowUpIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={active ? 'white' : '#8E8E93'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 12V2M2 7l5-5 5 5"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="#636366" strokeWidth="2.1" strokeLinecap="round">
    <path d="M6.5 1v11M1 6.5h11"/>
  </svg>
);

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg
    width="9" height="9" viewBox="0 0 10 10" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
    className={`inline transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
  >
    <path d="M2 3.5l3 3 3-3"/>
  </svg>
);

/* ─── Sources panel ──────────────────────────────────────────────── */
function SourcesPanel({
  sources, onOpen,
}: {
  sources: Source[];
  onOpen: (id: string, title: string, snippet: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-[5px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[12px] text-[#0B84FF] font-medium px-0 py-0"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 2h8M2 5h8M2 8h5"/>
        </svg>
        {sources.length} source{sources.length !== 1 ? 's' : ''}
        <ChevronDownIcon open={open} />
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 fade-in max-w-[300px]">
          {sources.map((src, i) => (
            <div
              key={i}
              className="flex gap-2 items-start bg-white rounded-2xl px-3 py-2 border border-[#E5E5EA] text-[12px]"
            >
              <span className="text-[#0B84FF] font-bold flex-shrink-0 w-4 pt-px">{i + 1}.</span>
              <div className="min-w-0">
                <p className="font-semibold text-[#1C1C1E] leading-snug truncate">{src.title}</p>
                <p className="text-[#8E8E93] mt-0.5 line-clamp-2">"{src.snippet}"</p>
                {src.documentId && (
                  <button
                    type="button"
                    onClick={() => onOpen(src.documentId, src.title, src.snippet)}
                    className="text-[#0B84FF] mt-1 px-0 py-0 text-[11px] font-normal"
                  >
                    View document →
                  </button>
                )}
              </div>
              {src.score !== undefined && (
                <span className="flex-shrink-0 text-[#8E8E93] text-[10px] pt-px">{(src.score * 100).toFixed(0)}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Search breakdown panel ─────────────────────────────────────── */
function BreakdownPanel({ breakdown }: { breakdown: SearchBreakdown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-[5px]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[12px] text-[#8E8E93] px-0 py-0"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="6" cy="6" r="4.5"/><path d="M6 4v2.5l1.5 1.5"/>
        </svg>
        Search details
        <ChevronDownIcon open={open} />
      </button>

      {open && breakdown.merged.length > 0 && (
        <div className="mt-2 fade-in max-w-[300px]">
          <p className="text-[10px] text-[#8E8E93] mb-1.5">
            Semantic {(breakdown.config.w_vec * 100).toFixed(0)}% · Keyword {(breakdown.config.w_text * 100).toFixed(0)}% · {breakdown.merged.length} chunks
          </p>
          <div className="space-y-1">
            {breakdown.merged.slice(0, 3).map((r) => (
              <div key={r.chunkId} className="flex gap-2 bg-white rounded-xl px-2.5 py-1.5 border border-[#E5E5EA] text-[11px]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1C1C1E] truncate">{r.title}</p>
                  <p className="text-[#8E8E93] line-clamp-1">{r.content}</p>
                </div>
                <span className="flex-shrink-0 text-[#8E8E93]">{(r.finalScore * 100).toFixed(0)}%</span>
              </div>
            ))}
            {breakdown.merged.length > 3 && (
              <p className="text-[11px] text-[#8E8E93] pl-1">+{breakdown.merged.length - 3} more</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ChatPage() {
  const [phoneNumber,    setPhoneNumber]    = useState('');
  const [phoneSet,       setPhoneSet]       = useState(false);
  const [phoneError,     setPhoneError]     = useState('');
  const [collectionId,   setCollectionId]   = useState('');
  const [collections,    setCollections]    = useState<any[]>([]);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [confirmClear,   setConfirmClear]   = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{
    id: string; title: string; content: string; highlightText: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  /* ── Init ─────────────────────────────────────────────── */
  useEffect(() => {
    const saved = localStorage.getItem('userPhoneNumber');
    if (saved) { setPhoneNumber(saved); setPhoneSet(true); }
    setCollectionId(localStorage.getItem('activeCollectionId') ?? '');
    fetch('/api/collections')
      .then(r => r.json())
      .then(d => setCollections(d.collections || []));
  }, []);

  /* ── Load conversation history ────────────────────────── */
  const loadConversationHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res  = await fetch(
        `/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`
      );
      const data = await res.json();
      if (data.messages) {
        setMessages(
          data.messages.map((m: any) => ({
            id:        m.id,
            role:      m.role,
            content:   m.content,
            sources:   m.sources,
            timestamp: new Date(m.created_at).getTime(),
          }))
        );
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  }, [phoneNumber, collectionId]);

  useEffect(() => {
    if (phoneNumber && collectionId && phoneSet) loadConversationHistory();
  }, [phoneNumber, collectionId, phoneSet, loadConversationHistory]);

  /* ── Scroll to bottom ─────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* ── Save message to server ───────────────────────────── */
  const saveMessage = async (msg: Message) => {
    try {
      await fetch('/api/conversations', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          phoneNumber, collectionId,
          role: msg.role, content: msg.content, sources: msg.sources,
        }),
      });
    } catch { /* silent */ }
  };

  /* ── Open document viewer ─────────────────────────────── */
  const openDocument = async (documentId: string, title: string, highlightText: string) => {
    try {
      const res  = await fetch(`/api/documents/${documentId}`);
      const data = await res.json();
      if (data.document) {
        setViewingDocument({ id: documentId, title, content: data.document.fullContent, highlightText });
      }
    } catch { /* silent */ }
  };

  /* ── Phone setup ──────────────────────────────────────── */
  const handleSetPhone = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) { setPhoneError('Please enter at least 10 digits.'); return; }
    setPhoneError('');
    localStorage.setItem('userPhoneNumber', phoneNumber);
    setPhoneSet(true);
  };

  /* ── Clear chat ───────────────────────────────────────── */
  const handleClearChat = async () => {
    try {
      await fetch(
        `/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`,
        { method: 'DELETE' }
      );
    } catch { /* silent */ }
    setMessages([]);
    setConfirmClear(false);
  };

  /* ── Change phone (sign out) ──────────────────────────── */
  const handleChangePhone = () => {
    setPhoneSet(false);
    setMessages([]);
    setPhoneNumber('');
    localStorage.removeItem('userPhoneNumber');
  };

  /* ── Switch collection ────────────────────────────────── */
  const handleCollectionChange = (newId: string) => {
    setCollectionId(newId);
    localStorage.setItem('activeCollectionId', newId);
    setMessages([]);
  };

  /* ── Auto-resize textarea ─────────────────────────────── */
  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  /* ── Send message ─────────────────────────────────────── */
  const sendMessage = async (text: string) => {
    if (!text.trim() || !collectionId || !phoneNumber || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: text.trim(), timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    await saveMessage(userMsg);

    try {
      const res = await fetch('/api/answer', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          collectionId,
          query: userMsg.content,
          debug: true,
          previousMessages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }

      const answerText =
        data?.answer?.trim()   ? data.answer.trim()
        : !res.ok              ? `Something went wrong (${res.status}). Please try again.`
        :                        'No answer could be generated from the documents.';

      const sources: Source[] = data?.citations ?? [];
      const sd = data?.search;
      const breakdown: SearchBreakdown | undefined = sd?.debug ? {
        vectorResults: sd.debug.vectorCandidates || [],
        textResults:   sd.debug.textCandidates  || [],
        merged: (sd.results || []).map((r: any) => ({
          chunkId:    r.chunkId,
          finalScore: r.finalScore,
          vecScore:   r.vecScoreNorm,
          textScore:  r.textScoreNorm,
          content:    r.content,
          title:      r.document?.title,
        })),
        config:           sd.debug.config,
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

  const activeCollection = collections.find(c => c.id === collectionId);
  const canSend = !!input.trim() && !!collectionId && !loading && !loadingHistory;

  /* ══════════════════════════════════════════════════════════
     ONBOARDING SCREEN
  ══════════════════════════════════════════════════════════ */
  if (!phoneSet) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[300px] text-center">

          {/* Icon */}
          <div className="w-[72px] h-[72px] rounded-full bg-[#0B84FF] flex items-center justify-center mx-auto mb-5 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>

          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight mb-1">Messages</h1>
          <p className="text-[14px] text-[#8E8E93] mb-8 leading-snug">
            Enter your number to keep your<br />conversation history private.
          </p>

          <div className="space-y-3 text-left">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, '')); setPhoneError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPhone()}
              placeholder="+1 (555) 000-0000"
              className="w-full px-4 py-3.5 rounded-2xl text-[16px] bg-[#F2F2F7] border border-transparent focus:border-[#0B84FF] focus:bg-white focus:shadow-[0_0_0_3px_rgba(11,132,255,0.15)] transition-all"
              style={{ outline: 'none' }}
              autoFocus
            />
            {phoneError && (
              <p className="text-[12px] text-[#FF3B30] px-1">{phoneError}</p>
            )}
            <button
              onClick={handleSetPhone}
              disabled={!phoneNumber.trim()}
              className="w-full py-3.5 rounded-2xl text-[16px] font-semibold bg-[#0B84FF] text-white disabled:opacity-40 active:scale-[0.98] transition-all hover:bg-[#0074E4]"
            >
              Continue
            </button>
          </div>

          <p className="text-[11px] text-[#8E8E93] mt-5">
            No SMS sent · No verification required
          </p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
     MAIN CHAT UI
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-[#E5E5EA] px-4 pt-3 pb-2.5">
        <div className="max-w-3xl mx-auto flex items-center">

          {/* Left: Clear chat */}
          <div className="w-24 flex items-center">
            {messages.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button" onClick={handleClearChat}
                    className="text-[13px] text-[#FF3B30] font-semibold px-0 py-0"
                  >Clear</button>
                  <span className="text-[#C7C7CC] select-none">·</span>
                  <button
                    type="button" onClick={() => setConfirmClear(false)}
                    className="text-[13px] text-[#0B84FF] px-0 py-0"
                  >Cancel</button>
                </div>
              ) : (
                <button
                  type="button" onClick={() => setConfirmClear(true)}
                  className="text-[13px] text-[#0B84FF] px-0 py-0"
                >Clear</button>
              )
            )}
          </div>

          {/* Center: Bot avatar + name + collection picker */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-[#E9E9EB] flex items-center justify-center mb-1 shadow-sm">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#636366" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="14" height="10" rx="3"/>
                <path d="M7 7V5a3 3 0 0 1 6 0v2"/>
                <circle cx="7.5" cy="12" r="1.1" fill="#636366" stroke="none"/>
                <circle cx="12.5" cy="12" r="1.1" fill="#636366" stroke="none"/>
              </svg>
            </div>
            <span className="text-[13.5px] font-semibold text-[#1C1C1E] leading-tight">RAG Assistant</span>
            <div className="flex items-center gap-0.5 mt-0.5">
              <select
                value={collectionId}
                onChange={(e) => handleCollectionChange(e.target.value)}
                className="text-[11px] text-[#0B84FF] border-0 bg-transparent p-0 focus:ring-0 cursor-pointer max-w-[180px] appearance-none text-center"
                style={{ boxShadow: 'none', outline: 'none' }}
              >
                <option value="">Select collection…</option>
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#0B84FF" strokeWidth="1.6" strokeLinecap="round">
                <path d="M1 2.5l3 3 3-3"/>
              </svg>
            </div>
          </div>

          {/* Right: User avatar (tap to sign out) */}
          <div className="w-24 flex justify-end">
            <button
              type="button"
              onClick={handleChangePhone}
              title={`Signed in as ${phoneNumber}\nClick to sign out`}
              className="w-8 h-8 rounded-full bg-[#0B84FF] flex items-center justify-center text-[11.5px] font-semibold text-white hover:bg-[#0074E4] transition-colors flex-shrink-0 shadow-sm"
            >
              {phoneNumber.replace(/\D/g, '').slice(-2) || '?'}
            </button>
          </div>

        </div>
      </header>

      {/* ── Messages area ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loadingHistory ? (
          /* Loading skeleton */
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>

        ) : messages.length === 0 ? (
          /* Empty / welcome state */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-full bg-[#E9E9EB] flex items-center justify-center mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2 className="text-[18px] font-semibold text-[#1C1C1E] mb-1">
              {collectionId ? activeCollection?.name ?? 'Chat' : 'No collection selected'}
            </h2>
            <p className="text-[13px] text-[#8E8E93] mb-7 max-w-xs leading-snug">
              {collectionId
                ? 'Answers come directly from your documents.'
                : 'Choose a collection above to start chatting.'}
            </p>
            {collectionId && (
              <div className="flex flex-col gap-2 w-full max-w-[260px]">
                {[
                  'What is this collection about?',
                  'Summarize the key points',
                  'What are the main topics?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="w-full px-4 py-2.5 rounded-2xl text-[14px] font-medium bg-[#F2F2F7] text-[#0B84FF] hover:bg-[#E5E5EA] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

        ) : (
          /* ── Message thread ── */
          <div className="px-3 py-3 max-w-3xl mx-auto">
            {messages.map((msg, index) => {
              const { isFirst, isLast } = getGroupInfo(messages, index);
              const showTs = shouldShowTimestamp(messages, index);
              const isLastUserMsg =
                msg.role === 'user' &&
                (index === messages.length - 1 || messages[index + 1]?.role !== 'user');

              return (
                <div key={msg.id} className="fade-in">
                  {/* Timestamp divider */}
                  {showTs && (
                    <div className="text-center text-[11px] font-medium text-[#8E8E93] my-4 select-none">
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    /* ── User bubble (right, blue) ── */
                    <div className={`flex justify-end ${isFirst ? 'mt-2' : 'mt-[3px]'}`}>
                      <div
                        className={`
                          bg-[#0B84FF] text-white text-[16px] leading-[1.4]
                          px-[14px] py-[9px] max-w-[78%] break-words
                          ${isLast
                            ? 'rounded-[20px] rounded-br-[5px]'
                            : 'rounded-[20px] rounded-br-[7px]'
                          }
                        `}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* ── Assistant bubble (left, gray) ── */
                    <div className={`flex items-end gap-2 ${isFirst ? 'mt-2' : 'mt-[3px]'}`}>
                      {/* Avatar — only on last in group */}
                      {isLast ? (
                        <div className="w-7 h-7 rounded-full bg-[#E9E9EB] flex-shrink-0 flex items-center justify-center">
                          <BotIcon />
                        </div>
                      ) : (
                        <div className="w-7 flex-shrink-0" />
                      )}

                      <div className="flex flex-col max-w-[78%]">
                        <div
                          className={`
                            bg-[#E9E9EB] text-[#1C1C1E] text-[16px] leading-[1.4]
                            px-[14px] py-[9px] break-words
                            ${isLast
                              ? 'rounded-[20px] rounded-bl-[5px]'
                              : 'rounded-[20px] rounded-bl-[7px]'
                            }
                          `}
                        >
                          <p className="whitespace-pre-wrap">{msg.content || '\u00A0'}</p>
                        </div>

                        {/* Sources + breakdown below last bubble in group */}
                        {(msg.sources?.length || msg.searchBreakdown) && (
                          <div className="ml-1 mt-1">
                            {msg.sources && msg.sources.length > 0 && (
                              <SourcesPanel sources={msg.sources} onOpen={openDocument} />
                            )}
                            {msg.searchBreakdown && (
                              <BreakdownPanel breakdown={msg.searchBreakdown} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* "Delivered" — below last sent user message */}
                  {isLastUserMsg && !loading && (
                    <div className="text-right text-[11px] text-[#8E8E93] mt-1 pr-1 select-none">
                      Delivered
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Typing indicator inside a bubble ── */}
            {loading && (
              <div className="flex items-end gap-2 mt-2 fade-in">
                <div className="w-7 h-7 rounded-full bg-[#E9E9EB] flex-shrink-0 flex items-center justify-center">
                  <BotIcon />
                </div>
                <div className="bg-[#E9E9EB] rounded-[20px] rounded-bl-[5px] px-[14px] py-[11px]">
                  <div className="flex gap-[5px] items-center h-[16px]">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#8E8E93] animate-[typingBounce_1.2s_ease-in-out_infinite]" />
                    <div className="w-[7px] h-[7px] rounded-full bg-[#8E8E93] animate-[typingBounce_1.2s_ease-in-out_infinite] [animation-delay:0.16s]" />
                    <div className="w-[7px] h-[7px] rounded-full bg-[#8E8E93] animate-[typingBounce_1.2s_ease-in-out_infinite] [animation-delay:0.32s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar (iMessage style) ──────────────────────── */}
      <div className="flex-shrink-0 bg-[#F2F2F7] border-t border-[#E5E5EA] px-3 py-2">
        <div className="max-w-3xl mx-auto flex items-end gap-2">

          {/* + button */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-[#E9E9EB] flex items-center justify-center flex-shrink-0 mb-0.5 hover:bg-[#D1D1D6] active:scale-95 transition-all"
            aria-label="Attachments"
          >
            <PlusIcon />
          </button>

          {/* Pill input */}
          <div
            className={`
              flex-1 flex items-end rounded-[22px] border bg-white px-4 py-[9px] transition-all
              ${collectionId
                ? 'border-[#C7C7CC] focus-within:border-[#0B84FF] focus-within:shadow-[0_0_0_2.5px_rgba(11,132,255,0.18)]'
                : 'border-[#E5E5EA] bg-[#F2F2F7]'
              }
            `}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
              }}
              placeholder={collectionId ? 'iMessage' : 'Select a collection first'}
              disabled={!collectionId || loading || loadingHistory}
              rows={1}
              className="
                flex-1 resize-none bg-transparent border-0 outline-none
                focus:ring-0 focus:shadow-none
                text-[16px] text-[#1C1C1E] placeholder-[#C7C7CC]
                leading-[1.4] py-0 disabled:opacity-50
              "
              style={{ minHeight: '22px', maxHeight: '120px', boxShadow: 'none' }}
            />
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5
              transition-all active:scale-95
              ${canSend
                ? 'bg-[#0B84FF] hover:bg-[#0074E4] shadow-sm'
                : 'bg-[#E9E9EB]'
              }
            `}
            aria-label="Send"
          >
            {loading
              ? <div
                  className="spinner"
                  style={{ width: '12px', height: '12px', borderWidth: '1.5px', borderColor: '#8E8E93', borderTopColor: 'transparent' }}
                />
              : <ArrowUpIcon active={canSend} />
            }
          </button>

        </div>

        {collectionId && (
          <p className="text-[10.5px] text-center text-[#8E8E93] mt-1.5 opacity-70 select-none">
            Return to send · Shift+Return for new line
          </p>
        )}
      </div>

      {/* ── Document viewer — bottom sheet ──────────────────── */}
      {viewingDocument && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 fade-in"
          onClick={() => setViewingDocument(null)}
        >
          <div
            className="bg-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar (mobile bottom-sheet indicator) */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-[4px] bg-[#D1D1D6] rounded-full" />
            </div>

            {/* Modal header */}
            <div className="px-5 py-3 border-b border-[#E5E5EA] flex items-center justify-between flex-shrink-0">
              <h2 className="text-[15px] font-semibold text-[#1C1C1E] truncate pr-4">
                {viewingDocument.title}
              </h2>
              <button
                onClick={() => setViewingDocument(null)}
                className="w-7 h-7 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#636366] hover:bg-[#E5E5EA] text-[18px] leading-none flex-shrink-0 font-light transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
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
