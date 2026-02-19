import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl mb-6">
            <span className="text-5xl">🔍</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">RAG Chat</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your intelligent document search assistant powered by hybrid AI
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link href="/chat" className="card hover:scale-[1.02] transition-transform duration-200 group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                💬
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  Start Chatting
                </h2>
                <p className="text-gray-600 text-sm">
                  Ask questions and get instant answers from your documents using AI-powered search
                </p>
              </div>
            </div>
          </Link>

          <Link href="/ingest" className="card hover:scale-[1.02] transition-transform duration-200 group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                📤
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Upload Documents
                </h2>
                <p className="text-gray-600 text-sm">
                  Add your documents to the knowledge base with automatic chunking and embedding
                </p>
              </div>
            </div>
          </Link>

          <Link href="/collections" className="card hover:scale-[1.02] transition-transform duration-200 group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                📁
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  Manage Collections
                </h2>
                <p className="text-gray-600 text-sm">
                  Organize your documents into collections for better structure and searchability
                </p>
              </div>
            </div>
          </Link>

          <Link href="/config" className="card hover:scale-[1.02] transition-transform duration-200 group">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-md">
                ⚙️
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                  Configure Search
                </h2>
                <p className="text-gray-600 text-sm">
                  Fine-tune hybrid search parameters to optimize results for your use case
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* How It Works */}
        <div className="card bg-gradient-to-br from-slate-50 to-blue-50 border-blue-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ⚡ How It Works
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                <span className="text-white font-bold">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Upload Documents</h4>
              <p className="text-sm text-gray-600">
                Add your documents - they're automatically chunked and embedded using OpenAI
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                <span className="text-white font-bold">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Ask Questions</h4>
              <p className="text-sm text-gray-600">
                Chat naturally - hybrid search finds relevant info using both AI and keywords
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
                <span className="text-white font-bold">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Get Answers</h4>
              <p className="text-sm text-gray-600">
                Receive accurate answers with source citations for verification
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Powered by</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="badge badge-gray px-4 py-2">
              <span className="font-semibold">Next.js 14</span>
            </div>
            <div className="badge badge-gray px-4 py-2">
              <span className="font-semibold">Supabase</span>
            </div>
            <div className="badge badge-gray px-4 py-2">
              <span className="font-semibold">OpenAI</span>
            </div>
            <div className="badge badge-gray px-4 py-2">
              <span className="font-semibold">pgvector</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
