'use client';

import { useEffect, useState, useRef } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; snippet: string; score?: number }>;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load phone number from localStorage
    const savedPhone = localStorage.getItem('userPhoneNumber');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setPhoneSet(true);
    }

    // Load active collection
    const activeId = localStorage.getItem('activeCollectionId') ?? '';
    setCollectionId(activeId);
    
    // Fetch collections
    fetch('/api/collections')
      .then(res => res.json())
      .then(data => setCollections(data.collections || []));
  }, []);

  // Load conversation history when phone and collection are set
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

    // Save user message
    await saveMessage(userMessage);

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

      // Save assistant message
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
    setMessages([]); // Will reload history in useEffect
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
          
          {/* Collection Selector & Actions */}
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
    </div>
  );
}
