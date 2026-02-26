'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ 
    chunkId: string;
    documentId: string;
    title: string;
    snippet: string;
    score?: number;
    vecScore?: number;
    textScore?: number;
  }>;
  searchBreakdown?: {
    vectorResults: Array<{ chunkId: string; score: number; content: string; title: string }>;
    textResults: Array<{ chunkId: string; score: number; content: string; title: string }>;
    merged: Array<{ chunkId: string; finalScore: number; vecScore: number; textScore: number; content: string; title: string }>;
    config: any;
    textSearchRelaxed?: boolean;
  };
  timestamp: number;
};

export default function ChatPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneSet, setPhoneSet] = useState(false);
  const [collectionId, setCollectionId] = useState('');
  const [collections, setCollections] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ id: string; title: string; content: string; highlightText: string } | null>(null);
  const [showBreakdown, setShowBreakdown] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedPhone = localStorage.getItem('userPhoneNumber');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setPhoneSet(true);
    }

    const activeId = localStorage.getItem('activeCollectionId') ?? '';
    setCollectionId(activeId);
    
    fetch('/api/collections')
      .then(res => res.json())
      .then(data => setCollections(data.collections || []));
  }, []);

  const loadConversationHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`);
      const data = await res.json();
      if (data.messages) {
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sources: msg.sources,
          timestamp: new Date(msg.created_at).getTime(),
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [phoneNumber, collectionId]);

  useEffect(() => {
    if (phoneNumber && collectionId && phoneSet) {
      loadConversationHistory();
    }
  }, [phoneNumber, collectionId, phoneSet, loadConversationHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveMessage = async (message: Message) => {
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          collectionId,
          role: message.role,
          content: message.content,
          sources: message.sources,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const openDocument = async (documentId: string, title: string, highlightText: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      const data = await res.json();
      if (data.document) {
        setViewingDocument({
          id: documentId,
          title,
          content: data.document.fullContent,
          highlightText,
        });
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const handleSetPhone = () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      alert('Please enter a valid phone number (at least 10 digits)');
      return;
    }
    localStorage.setItem('userPhoneNumber', phoneNumber);
    setPhoneSet(true);
  };

  const handleClearChat = async () => {
    if (!collectionId) {
      setMessages([]);
      return;
    }
    if (!confirm('Clear all conversation history for this collection? This cannot be undone.')) {
      return;
    }
    const url = `/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`;
    try {
      await fetch(url, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear chat on server:', error);
    }
    setMessages([]);
  };

  const handleChangePhone = () => {
    if (messages.length > 0 && !confirm('Changing phone number will load a different conversation history. Continue?')) {
      return;
    }
    setPhoneSet(false);
    setMessages([]);
  };

  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    if (messages.length > 0 && !confirm('Switching collections will load a different conversation. Continue?')) {
      return;
    }
    setCollectionId(newId);
    localStorage.setItem('activeCollectionId', newId);
    setMessages([]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || !collectionId || !phoneNumber || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    await saveMessage(userMessage);

    try {
      const answerRes = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId,
          query: userMessage.content,
          debug: true,
          previousMessages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      let answerData: any = null;
      try {
        answerData = await answerRes.json();
      } catch {
        answerData = null;
      }

      const answerText =
        answerData && typeof answerData.answer === 'string' && answerData.answer.trim()
          ? answerData.answer.trim()
          : !answerRes.ok
            ? `Sorry, there was an error (${answerRes.status}). Please try again.`
            : 'No answer could be generated.';

      const sources: any[] = answerData?.citations ?? [];
      const searchData = answerData?.search;
      const breakdown = searchData?.debug
        ? {
            vectorResults: searchData.debug.vectorCandidates || [],
            textResults: searchData.debug.textCandidates || [],
            merged:
              searchData.results?.map((r: any) => ({
                chunkId: r.chunkId,
                finalScore: r.finalScore,
                vecScore: r.vecScoreNorm,
                textScore: r.textScoreNorm,
                content: r.content,
                title: r.document?.title,
              })) || [],
            config: searchData.debug.config,
            textSearchRelaxed: searchData.debug.textSearchRelaxed === true,
          }
        : undefined;

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: answerText,
        sources,
        searchBreakdown: breakdown,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);

      if (!answerRes.ok) {
        throw new Error(`Answer API error: ${answerRes.status}`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      await saveMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage(input);
  };

  // Phone number input screen
  if (!phoneSet) {
    return (
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="card max-w-sm w-full">
          <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Identify your chat</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Your number keeps this conversation private and saved.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder="+1 234 567 8900"
                className="w-full text-[15px]"
                onKeyDown={(e) => e.key === 'Enter' && handleSetPhone()}
                autoFocus
              />
            </div>

            <button
              onClick={handleSetPhone}
              disabled={!phoneNumber.trim() || phoneNumber.length < 10}
              className="btn-primary w-full"
            >
              Continue
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] mt-6 leading-relaxed">
            Used only to separate your history. No SMS or verification.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg)]">
      <header className="flex-shrink-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <select
              value={collectionId}
              onChange={handleCollectionChange}
              className="w-48 px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] cursor-pointer"
            >
              <option value="">Collection...</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
            <span className="text-sm text-[var(--text-secondary)]">
              {phoneNumber}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleChangePhone();
                }}
                className="ml-2 text-[var(--accent)] hover:underline cursor-pointer font-medium"
              >
                Change
              </button>
            </span>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearChat();
              }}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[#f5f5f7]"
              title="Clear history"
            >
              Clear chat
            </button>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md">
            <h2 className="text-xl font-semibold text-[var(--text)] mb-1">Ask anything</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {collectionId
                ? "Questions are answered from your documents."
                : "Select a collection to start."}
            </p>
            {collectionId && (
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => setInput("What is this collection about?")}
                  className="px-4 py-2 rounded-lg text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[#f5f5f7]"
                >
                  What is this about?
                </button>
                <button
                  onClick={() => setInput("Summarize the key points")}
                  className="px-4 py-2 rounded-lg text-sm bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[#f5f5f7]"
                >
                  Summarize key points
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                <div className={`${message.role === 'user' ? 'message-user max-w-[80%]' : 'w-full'}`}>
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Answer - ensure bubble and text are visible */}
                      <div className="message-assistant max-w-[80%] min-h-[2.5rem]">
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content || '\u00A0'}</p>
                      </div>

                      {/* Search Breakdown */}
                      {message.searchBreakdown && (
                        <div className="rounded-xl border border-[var(--border)] bg-[#fafafa] overflow-hidden">
                          <button
                            onClick={() => setShowBreakdown(showBreakdown === message.id ? null : message.id)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left text-sm"
                          >
                            <span className="font-medium text-[var(--text)]">Search details</span>
                            <span className="text-[var(--text-secondary)]">{showBreakdown === message.id ? '−' : '+'}</span>
                          </button>
                          {showBreakdown === message.id && (
                            <div className="px-4 pb-4 pt-0 space-y-4 border-t border-[var(--border)]">
                              <div className="text-xs text-[var(--text-secondary)] pt-3">
                                Semantic {(message.searchBreakdown.config.w_vec * 100).toFixed(0)}% · Keyword {(message.searchBreakdown.config.w_text * 100).toFixed(0)}% · {message.searchBreakdown.merged.length} chunks
                              </div>
                              <div className="grid gap-2">
                                {message.searchBreakdown.merged.slice(0, 5).map((result: any, idx: number) => (
                                  <div key={result.chunkId} className="bg-[var(--surface)] rounded-lg p-3 text-sm border border-[var(--border)]">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-[var(--text)]">{result.title}</span>
                                      <span className="text-xs text-[var(--text-secondary)]">{(result.finalScore * 100).toFixed(0)}%</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{result.content}</p>
                                  </div>
                                ))}
                                {message.searchBreakdown.merged.length > 5 && (
                                  <p className="text-xs text-[var(--text-secondary)]">+{message.searchBreakdown.merged.length - 5} more</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                          <p className="text-sm font-medium text-[var(--text)] mb-3">Sources</p>
                          <div className="space-y-2">
                            {message.sources.map((source, idx) => (
                              <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                                <div className="min-w-0">
                                  <p className="font-medium text-[var(--text)] truncate">{source.title}</p>
                                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">"{source.snippet}..."</p>
                                  {source.documentId && (
                                    <button
                                      onClick={() => openDocument(source.documentId, source.title, source.snippet)}
                                      className="text-xs text-[var(--accent)] hover:underline mt-1"
                                    >
                                      View document
                                    </button>
                                  )}
                                </div>
                                {source.score !== undefined && (
                                  <span className="text-xs text-[var(--text-secondary)] flex-shrink-0">{(source.score * 100).toFixed(0)}%</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start fade-in">
                <div className="message-assistant">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <div className="spinner" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder={collectionId ? "Ask a question..." : "Select a collection"}
              className="flex-1 resize-none min-h-[44px] py-3 px-4 text-[15px] rounded-xl border border-[var(--border)] focus:border-[var(--accent)]"
              disabled={!collectionId || loading || loadingHistory}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || !collectionId || loading || loadingHistory}
              className="btn-primary px-5 rounded-xl self-end disabled:opacity-40"
            >
              {loading ? <div className="spinner" /> : 'Send'}
            </button>
          </div>
        </form>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 fade-in" onClick={() => setViewingDocument(null)}>
          <div className="bg-[var(--surface)] rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)] truncate pr-4">{viewingDocument.title}</h2>
              <button onClick={() => setViewingDocument(null)} className="text-[var(--text-secondary)] hover:text-[var(--text)] text-xl leading-none p-1">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose max-w-none">
                {viewingDocument.content.split('\n\n').map((paragraph, idx) => {
                  const isHighlighted = paragraph.includes(viewingDocument.highlightText);
                  return (
                    <p
                      key={idx}
                      className={`mb-4 ${isHighlighted ? 'bg-amber-100/60 border-l-2 border-amber-400 pl-4 py-2' : ''}`}
                    >
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
