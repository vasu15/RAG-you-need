'use client';

import { useEffect, useState, useRef } from 'react';

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

  useEffect(() => {
    if (phoneNumber && collectionId && phoneSet) {
      loadConversationHistory();
    }
  }, [phoneNumber, collectionId, phoneSet]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversationHistory = async () => {
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
  };

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
    if (!confirm('Clear all conversation history for this collection? This cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/conversations?phoneNumber=${encodeURIComponent(phoneNumber)}&collectionId=${collectionId}`, {
        method: 'DELETE',
      });
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  const handleChangePhone = () => {
    if (messages.length > 0 && !confirm('Changing phone number will load a different conversation history. Continue?')) {
      return;
    }
    setPhoneSet(false);
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !collectionId || !phoneNumber || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    await saveMessage(userMessage);

    try {
      // Search with debug info
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, query: userMessage.content, debug: true }),
      });
      const searchData = await searchRes.json();

      let answerText = '';
      let sources: any[] = [];

      // Prepare search breakdown
      const breakdown = searchData.debug ? {
        vectorResults: searchData.debug.vectorCandidates || [],
        textResults: searchData.debug.textCandidates || [],
        merged: searchData.results?.map((r: any) => ({
          chunkId: r.chunkId,
          finalScore: r.finalScore,
          vecScore: r.vecScoreNorm,
          textScore: r.textScoreNorm,
          content: r.content,
          title: r.document?.title,
        })) || [],
        config: searchData.debug.config,
      } : undefined;

      try {
        const answerRes = await fetch('/api/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collectionId, query: userMessage.content }),
        });
        const answerData = await answerRes.json();
        answerText = answerData.answer || '';
        sources = answerData.citations || [];
      } catch {
        answerText = searchData.results?.[0]?.content || 'No relevant information found.';
        sources = searchData.results?.slice(0, 3).map((r: any) => ({
          chunkId: r.chunkId,
          documentId: r.document?.id,
          title: r.document?.title || 'Document',
          snippet: r.content.slice(0, 150),
          score: r.finalScore,
          vecScore: r.vecScoreNorm,
          textScore: r.textScoreNorm,
        })) || [];
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answerText,
        sources,
        searchBreakdown: breakdown,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(assistantMessage);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
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

  const handleCollectionChange = (newId: string) => {
    if (messages.length > 0 && !confirm('Switching collections will load a different conversation. Continue?')) {
      return;
    }
    setCollectionId(newId);
    localStorage.setItem('activeCollectionId', newId);
    setMessages([]);
  };

  // Phone number input screen
  if (!phoneSet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full shadow-lg mb-4">
              <span className="text-4xl">📱</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Phone Number</h1>
            <p className="text-gray-600 text-sm">
              We'll use this to save your conversation history and keep your chats separate from others
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))}
                placeholder="+1234567890 or 1234567890"
                className="w-full text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSetPhone()}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                At least 10 digits. Include country code if applicable.
              </p>
            </div>

            <button
              onClick={handleSetPhone}
              disabled={!phoneNumber.trim() || phoneNumber.length < 10}
              className="btn-primary w-full"
            >
              Continue to Chat
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-gray-700">
            <p className="font-semibold mb-2">🔒 Privacy Notice:</p>
            <ul className="space-y-1 text-xs">
              <li>• Your phone number is only used to identify your conversations</li>
              <li>• Each phone number has its own isolated chat history</li>
              <li>• Your conversations are never mixed with others</li>
              <li>• No phone verification or SMS is required</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chat Assistant</h1>
              <p className="text-sm text-gray-500 mt-1">
                User: <span className="font-mono text-blue-600">{phoneNumber}</span>
                <button
                  onClick={handleChangePhone}
                  className="ml-2 text-xs text-blue-600 hover:underline"
                >
                  Change
                </button>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="btn-secondary text-sm px-3 py-2"
                title="Clear conversation history"
              >
                🗑️ Clear Chat
              </button>
            )}
            <select
              value={collectionId}
              onChange={(e) => handleCollectionChange(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="">Select a collection...</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="spinner mb-3"></div>
              <p className="text-gray-600">Loading your conversation history...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start a Conversation</h2>
            <p className="text-gray-500 mb-2 max-w-md">
              {collectionId 
                ? `Hey ${phoneNumber}! Ask me anything about your documents.`
                : "Please select a collection to start chatting."}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Your conversation history is saved and will persist across sessions
            </p>
            {collectionId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <button
                  onClick={() => setInput("What is this collection about?")}
                  className="px-4 py-3 bg-white rounded-xl text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  💡 What is this collection about?
                </button>
                <button
                  onClick={() => setInput("Summarize the key points")}
                  className="px-4 py-3 bg-white rounded-xl text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  📝 Summarize the key points
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
                      {/* Answer */}
                      <div className="message-assistant max-w-[80%]">
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>

                      {/* Search Breakdown */}
                      {message.searchBreakdown && (
                        <div className="card bg-gray-50 border-gray-200">
                          <button
                            onClick={() => setShowBreakdown(showBreakdown === message.id ? null : message.id)}
                            className="w-full flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🔍</span>
                              <span className="font-semibold text-gray-900">Hybrid Search Breakdown</span>
                              <span className="badge badge-blue">{message.searchBreakdown.merged.length} results</span>
                            </div>
                            <span className="text-gray-500">{showBreakdown === message.id ? '▼' : '▶'}</span>
                          </button>

                          {showBreakdown === message.id && (
                            <div className="mt-4 space-y-4 fade-in">
                              {/* Config */}
                              <div className="bg-white rounded-lg p-3 text-sm">
                                <p className="font-semibold text-gray-700 mb-2">⚙️ Search Configuration:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>AI Weight: <span className="badge badge-blue">{(message.searchBreakdown.config.w_vec * 100).toFixed(0)}%</span></div>
                                  <div>Keyword Weight: <span className="badge badge-green">{(message.searchBreakdown.config.w_text * 100).toFixed(0)}%</span></div>
                                </div>
                              </div>

                              {/* Final Merged Results */}
                              <div>
                                <p className="font-semibold text-gray-700 mb-2 text-sm">📊 Final Ranked Results:</p>
                                <div className="space-y-2">
                                  {message.searchBreakdown.merged.map((result, idx) => (
                                    <div key={result.chunkId} className="bg-white rounded-lg p-3 text-sm">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-blue-600">#{idx + 1}</span>
                                          <span className="font-medium text-gray-900">{result.title}</span>
                                        </div>
                                        <span className="badge badge-blue">
                                          Score: {(result.finalScore * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                      <p className="text-gray-600 text-xs mb-2">{result.content.slice(0, 150)}...</p>
                                      <div className="flex gap-2 text-xs">
                                        <span className="badge bg-blue-100 text-blue-700">
                                          AI: {(result.vecScore * 100).toFixed(0)}%
                                        </span>
                                        <span className="badge bg-green-100 text-green-700">
                                          Keyword: {(result.textScore * 100).toFixed(0)}%
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="card bg-white border-blue-100">
                          <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span>📚</span>
                            <span>Sources & Citations</span>
                          </p>
                          <div className="space-y-3">
                            {message.sources.map((source, idx) => (
                              <div key={idx} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="font-medium text-gray-900 text-sm flex items-center gap-2">
                                    <span className="text-blue-600">{idx + 1}.</span>
                                    <span>{source.title}</span>
                                  </div>
                                  {source.score !== undefined && (
                                    <span className="badge badge-blue text-xs">
                                      {(source.score * 100).toFixed(0)}%
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-700 text-sm mb-2 italic">"{source.snippet}..."</p>
                                <button
                                  onClick={() => source.documentId && openDocument(source.documentId, source.title, source.snippet)}
                                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                  disabled={!source.documentId}
                                >
                                  <span>📄</span>
                                  <span>View full document</span>
                                </button>
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
                  <div className="flex items-center gap-2">
                    <div className="spinner"></div>
                    <span>Searching documents...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={collectionId ? "Ask a question... (Shift+Enter for new line)" : "Select a collection first"}
              className="flex-1 resize-none h-12 leading-6"
              disabled={!collectionId || loading || loadingHistory}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || !collectionId || loading || loadingHistory}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <div className="spinner"></div> : '➤'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Shift+Enter</kbd> for new line
          </p>
        </form>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{viewingDocument.title}</h2>
                <p className="text-sm text-gray-500 mt-1">Full document with highlighted section</p>
              </div>
              <button
                onClick={() => setViewingDocument(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                {viewingDocument.content.split('\n\n').map((paragraph, idx) => {
                  const isHighlighted = paragraph.includes(viewingDocument.highlightText);
                  return (
                    <p
                      key={idx}
                      className={`mb-4 ${isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-500 pl-4 py-2 font-medium' : ''}`}
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
