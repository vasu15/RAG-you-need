import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <title>RAG Chat - Hybrid Search Assistant</title>
      </head>
      <body>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-lg">
            {/* Logo/Header */}
            <div className="p-6 border-b border-gray-100">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                🔍 RAG Chat
              </h1>
              <p className="text-xs text-gray-500 mt-1">Hybrid Search Assistant</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              <NavLink href="/chat" icon="💬" label="Chat" />
              <NavLink href="/ingest" icon="📤" label="Upload Documents" />
              <NavLink href="/collections" icon="📁" label="Collections" />
              <NavLink href="/config" icon="⚙️" label="Settings" />
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
              <p className="mb-1">Hybrid RAG Engine</p>
              <p>Vector + Keyword Search</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform duration-200">{icon}</span>
      <span className="font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}
