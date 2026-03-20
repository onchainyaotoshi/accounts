'use client';

import { useEffect, useState } from 'react';
import { admin, type AuditLog } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

function formatTimestamp(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const eventColors: Record<string, string> = {
  LOGIN_SUCCESS: 'badge-success',
  LOGIN_FAILED: 'badge-danger',
  LOGOUT: 'badge-neutral',
  SIGNUP: 'badge-accent',
  PASSWORD_RESET_REQUEST: 'badge-neutral',
  PASSWORD_RESET_COMPLETE: 'badge-neutral',
  SESSION_REVOKED: 'badge-danger',
  ALL_SESSIONS_REVOKED: 'badge-danger',
  INVITE_CREATED: 'badge-accent',
  INVITE_USED: 'badge-success',
  INVITE_REVOKED: 'badge-danger',
  CLIENT_CREATED: 'badge-accent',
  CLIENT_UPDATED: 'badge-neutral',
  AUTH_CODE_ISSUED: 'badge-neutral',
  TOKEN_ISSUED: 'badge-success',
};

function formatEventType(eventType: string) {
  return eventType.toLowerCase().replace(/_/g, ' ');
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin.auditLogs().then((res) => {
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description={total > 0 ? `${total} events recorded` : 'Security events and administrative actions'}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="card text-center text-text-secondary py-12 text-sm">
          No audit events recorded yet.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Event</th>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-5 py-3 text-text-secondary whitespace-nowrap font-mono text-xs">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={eventColors[log.eventType] || 'badge-neutral'}>
                      {formatEventType(log.eventType)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {log.user?.email || (log.userId ? <span className="font-mono text-xs text-text-tertiary">{log.userId.slice(0, 8)}…</span> : <span className="text-text-tertiary">—</span>)}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {log.client ? (
                      <span className="text-xs">{log.client.name}</span>
                    ) : log.clientId ? (
                      <span className="font-mono text-xs text-text-tertiary">{log.clientId.slice(0, 8)}…</span>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-tertiary font-mono text-xs">
                    {log.ipAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
