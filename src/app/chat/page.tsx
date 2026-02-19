'use client';

import { useEffect, useState, useRef } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; snippet: string; score: number }>;
  timestamp: number;
};

export default function ChatPage() {
  const [collectionId, setCollectionId] = useState('');
  const [collections, setCollections] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load active collection
    const activeId = localStorage.getItem('activeCollectionId') ?? '';
    setCollectionId(activeId);
    
    // Fetch collections
    fetch('/api/collections')
      .then(res => res.json())
      .then(data => setCollections(data.collections || []));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !collectionId || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Search for relevant chunks
      const searchRes = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionId, query: userMessage.content }),
      });
      const searchData = await searchRes.json();

      // Try to get answer
      let answerText = '';
      let sources: any[] = [];

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
        // Fallback to search results
        answerText = searchData.results?.[0]?.content || 'No relevant information found.';
        sources = searchData.results?.slice(0, 3).map((r: any) => ({
          title: r.document?.title || 'Document',
          snippet: r.content.slice(0, 150),
          score: r.finalScore,
        })) || [];
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answerText,
        sources,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionChange = (newId: string) => {
    setCollectionId(newId);
    localStorage.setItem('activeCollectionId', newId);
    setMessages([]); // Clear chat when switching collections
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Assistant</h1>
            <p className="text-sm text-gray-500 mt-1">Ask questions about your documents</p>
          </div>
          
          {/* Collection Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Collection:</label>
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
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start a Conversation</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              {collectionId 
                ? "Ask me anything about your documents. I'll search through them and provide relevant answers."
                : "Please select a collection to start chatting."}
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
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}>
                <div className={message.role === 'user' ? 'message-user' : 'message-assistant'}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-2">📚 Sources:</p>
                      <div className="space-y-2">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="text-xs bg-gray-50 rounded-lg p-2">
                            <div className="font-medium text-gray-700 mb-1">{source.title}</div>
                            <div className="text-gray-600">{source.snippet}...</div>
                            {source.score !== undefined && (
                              <div className="mt-1">
                                <span className="badge badge-blue">
                                  Relevance: {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
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
              disabled={!collectionId || loading}
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || !collectionId || loading}
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
    </div>
  );
}
