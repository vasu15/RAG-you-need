import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="max-w-5xl mx-auto p-6 space-y-6">{children}</body>
    </html>
  );
}
