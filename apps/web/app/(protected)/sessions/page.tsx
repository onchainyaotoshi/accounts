'use client';

import { useEffect, useState } from 'react';
import { sessions as sessionsApi, type Session } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

function parseUA(ua: string): string {
  if (!ua) return 'Unknown';
  const browser = ua.match(/(Chrome|Firefox|Safari|Edge|Opera|Brave)\/[\d.]+/)?.[0]
    || ua.match(/(curl|PostmanRuntime|httpie)\/[\d.]+/)?.[0]
    || 'Unknown browser';
  const os = ua.match(/\((Windows[^)]*|Macintosh[^)]*|Linux[^)]*|iPhone[^)]*|Android[^)]*)\)/)?.[1]
    || '';
  return `${browser}${os ? ' on ' + os.split(';')[0] : ''}`;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function SessionsPage() {
  const [data, setData] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await sessionsApi.list();
      setData(res.sessions);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await sessionsApi.revoke(id);
      await load();
    } catch {}
    setRevoking(null);
  };

  const handleRevokeAll = async () => {
    setRevoking('all');
    try {
      await sessionsApi.revokeOthers();
      await load();
    } catch {}
    setRevoking(null);
  };

  return (
    <>
      <PageHeader
        title="Sessions"
        description="Manage your active sessions across devices"
        action={
          data.filter((s) => !s.isCurrent).length > 0 ? (
            <button
              className="btn-danger btn-small"
              onClick={handleRevokeAll}
              disabled={revoking === 'all'}
            >
              {revoking === 'all' ? 'Revoking...' : 'Revoke all others'}
            </button>
          ) : undefined
        }
      />
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="card text-center text-text-secondary py-12 text-sm">
          No active sessions found.
        </div>
      ) : (
        <div className="card p-0 divide-y divide-border">
          {data.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {parseUA(session.userAgent)}
                  </span>
                  {session.isCurrent && (
                    <span className="badge-accent">Current</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                  <span>{session.ipAddress}</span>
                  <span>Last seen {timeAgo(session.lastSeenAt)}</span>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  className="btn-ghost btn-small ml-4 shrink-0"
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                >
                  {revoking === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
