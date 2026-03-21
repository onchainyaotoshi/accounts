'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/lib/hooks';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/sessions', label: 'Sessions' },
];

const adminItems = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/invites', label: 'Invites' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout();
    } catch {}
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-surface-1 flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
              <span className="text-accent font-mono text-xs font-bold">Y</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">Accounts</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
            Account
          </div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {user.role === 'ADMIN' && (
            <>
              <div className="px-3 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Administration
              </div>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href)
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-2'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="p-3 border-t border-border">
          <div className="px-3 py-2">
            <div className="text-sm text-text-primary truncate">{user.email}</div>
            <div className="text-xs text-text-tertiary mt-0.5">
              {user.email_verified ? 'Verified' : 'Unverified'}
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full mt-1 btn-ghost btn-small justify-start text-text-tertiary hover:text-danger"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
