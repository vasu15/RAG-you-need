import './globals.css';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>RAG — Chat over your documents</title>
      </head>
      <body>
        <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
          <Sidebar />

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
