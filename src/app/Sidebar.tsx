'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ChatIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2.5h12c.3 0 .5.2.5.5v7c0 .3-.2.5-.5.5H7.5L4 14V10.5H2c-.3 0-.5-.2-.5-.5V3c0-.3.2-.5.5-.5z"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 10.5V3.5M5 6.5L8 3.5l3 3M2 13.5h12"/>
  </svg>
);

const CollectionsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="1.5" width="5" height="5" rx="1.2"/>
    <rect x="9.5" y="1.5" width="5" height="5" rx="1.2"/>
    <rect x="1.5" y="9.5" width="5" height="5" rx="1.2"/>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1.2"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="2.25"/>
    <path d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M12.4 3.6l-1.3 1.3M4.9 11.1l-1.3 1.3"/>
  </svg>
);

const navItems = [
  { href: '/chat',        label: 'Chat',        Icon: ChatIcon },
  { href: '/ingest',      label: 'Upload',      Icon: UploadIcon },
  { href: '/collections', label: 'Collections', Icon: CollectionsIcon },
  { href: '/config',      label: 'Settings',    Icon: SettingsIcon },
];

function NavLink({ href, label, Icon }: { href: string; label: string; Icon: () => JSX.Element }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-all duration-100 ${
        isActive
          ? 'bg-[rgba(0,113,227,0.09)] text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[#eeeef0]'
      }`}
    >
      <Icon />
      {label}
    </Link>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-52 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] flex-shrink-0">
      {/* Wordmark */}
      <div className="px-4 pt-5 pb-4 border-b border-[var(--border)]">
        <Link href="/chat" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="white">
              <path d="M1 1.5h12c.3 0 .5.2.5.5v7c0 .3-.2.5-.5.5H7.5L4 13V9.5H1c-.3 0-.5-.2-.5-.5V2c0-.3.2-.5.5-.5z"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[var(--text)] tracking-tight leading-none">RAG</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-none">Document assistant</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 mt-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-secondary)] leading-snug">
          Hybrid search · Vector + keyword
        </p>
      </div>
    </aside>
  );
}
