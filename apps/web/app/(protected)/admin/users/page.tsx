'use client';

import { useEffect, useState } from 'react';
import { admin, type AdminUser } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    admin.users().then((res) => {
      setUsers(res.users);
      setTotal(res.total);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Users"
        description={loading ? 'Loading...' : `${total} registered user${total !== 1 ? 's' : ''}`}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="card text-center text-text-secondary py-12 text-sm">
          No users found.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Last login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-5 py-3 font-medium">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={u.role === 'admin' ? 'badge-accent' : 'badge-neutral'}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {u.emailVerified ? (
                      <span className="badge-success">Yes</span>
                    ) : (
                      <span className="badge-neutral">No</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">{formatDate(u.createdAt)}</td>
                  <td className="px-5 py-3 text-text-secondary">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className="text-text-tertiary">Never</span>}
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
