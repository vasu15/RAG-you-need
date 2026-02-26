import './globals.css';
import type { ReactNode } from 'react';
import Link from 'next/link';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>RAG — Chat over your documents</title>
      </head>
      <body>
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
          <aside className="w-56 flex flex-col bg-[var(--surface)] border-r border-[var(--border)]">
            <div className="p-5 border-b border-[var(--border)]">
              <Link href="/chat" className="text-lg font-semibold text-[var(--text)] tracking-tight">
                RAG
              </Link>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Chat over your documents</p>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
              <NavLink href="/chat" label="Chat" />
              <NavLink href="/ingest" label="Upload" />
              <NavLink href="/collections" label="Collections" />
              <NavLink href="/config" label="Settings" />
            </nav>

            <div className="p-3 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
              Hybrid search · Vector + keyword
            </div>
          </aside>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2.5 rounded-lg text-[15px] text-[var(--text)] hover:bg-[#f5f5f7] transition-colors"
    >
      {label}
    </Link>
  );
}
