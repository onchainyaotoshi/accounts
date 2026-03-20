'use client';

import { useEffect, useState } from 'react';
import { admin, type InviteCode } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';

export default function InvitesPage() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Create form
  const [assignedEmail, setAssignedEmail] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresIn, setExpiresIn] = useState('7');

  const load = async () => {
    try {
      const res = await admin.invites();
      setInvites(res.invites);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const expiresAt = expiresIn
        ? new Date(Date.now() + parseInt(expiresIn) * 86400000).toISOString()
        : undefined;
      await admin.createInvite({
        assignedEmail: assignedEmail || undefined,
        maxUses: parseInt(maxUses) || 1,
        expiresAt,
      });
      setShowCreate(false);
      setAssignedEmail('');
      setMaxUses('1');
      setExpiresIn('7');
      await load();
    } catch {}
    setCreating(false);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      await admin.revokeInvite(id);
      await load();
    } catch {}
    setRevoking(null);
  };

  const isActive = (inv: InviteCode) =>
    !inv.revokedAt &&
    inv.useCount < inv.maxUses &&
    (!inv.expiresAt || new Date(inv.expiresAt) > new Date());

  return (
    <>
      <PageHeader
        title="Invite Codes"
        description="Create and manage invite codes for new users"
        action={
          <button className="btn-primary btn-small" onClick={() => setShowCreate(true)}>
            Create invite
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : invites.length === 0 ? (
        <div className="card text-center text-text-secondary py-12 text-sm">
          No invite codes yet.
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-widest text-text-tertiary">
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Assigned to</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invites.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-2/50 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs">{inv.code}</td>
                  <td className="px-5 py-3 text-text-secondary">
                    {inv.assignedEmail || <span className="text-text-tertiary">Any</span>}
                  </td>
                  <td className="px-5 py-3 text-text-secondary">
                    {inv.useCount} / {inv.maxUses}
                  </td>
                  <td className="px-5 py-3">
                    {inv.revokedAt ? (
                      <span className="badge-danger">Revoked</span>
                    ) : isActive(inv) ? (
                      <span className="badge-success">Active</span>
                    ) : (
                      <span className="badge-neutral">Expired</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {isActive(inv) && (
                      <button
                        className="btn-ghost btn-small"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revoking === inv.id}
                      >
                        {revoking === inv.id ? 'Revoking...' : 'Revoke'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Invite Code">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Assigned email <span className="text-text-tertiary">(optional)</span>
            </label>
            <input
              type="email"
              value={assignedEmail}
              onChange={(e) => setAssignedEmail(e.target.value)}
              className="input-field"
              placeholder="user@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Max uses
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="input-field"
                min={1}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Expires in (days)
              </label>
              <input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="input-field"
                min={1}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
