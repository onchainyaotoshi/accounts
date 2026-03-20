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

const actionColors: Record<string, string> = {
  login: 'badge-success',
  logout: 'badge-neutral',
  signup: 'badge-accent',
  'password.reset': 'badge-neutral',
  'password.forgot': 'badge-neutral',
  'session.revoke': 'badge-danger',
  'invite.create': 'badge-accent',
  'invite.revoke': 'badge-danger',
  'client.create': 'badge-accent',
  'client.update': 'badge-neutral',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin.auditLogs().then((res) => {
      setLogs(res.logs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Security events and administrative actions"
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
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Target</th>
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
                    <span className={actionColors[log.action] || 'badge-neutral'}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {log.actorEmail || log.actorId || <span className="text-text-tertiary">System</span>}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {log.targetType ? (
                      <span className="font-mono text-xs">
                        {log.targetType}
                        {log.targetId && <span className="text-text-tertiary">:{log.targetId.slice(0, 8)}</span>}
                      </span>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-tertiary font-mono text-xs">
                    {log.ipAddress || '-'}
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
