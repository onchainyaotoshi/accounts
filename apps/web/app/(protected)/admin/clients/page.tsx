'use client';

import { useEffect, useState } from 'react';
import { admin, type Client } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<string>('PUBLIC');
  const [redirectUris, setRedirectUris] = useState('');
  const [postLogoutRedirectUris, setPostLogoutRedirectUris] = useState('');

  const load = async () => {
    try {
      const res = await admin.clients();
      setClients(res.clients);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const uris = redirectUris
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const logoutUris = postLogoutRedirectUris
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
      const result = await admin.createClient({
        name,
        slug,
        type,
        redirectUris: uris,
        postLogoutRedirectUris: logoutUris,
      });
      if (result.clientSecret) {
        setCreatedSecret(result.clientSecret);
      }
      setShowCreate(false);
      setName('');
      setSlug('');
      setType('PUBLIC');
      setRedirectUris('');
      setPostLogoutRedirectUris('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
    setCreating(false);
  };

  return (
    <>
      <PageHeader
        title="OAuth Clients"
        description="Registered applications using Yaotoshi auth"
        action={
          <button className="btn-primary btn-small" onClick={() => setShowCreate(true)}>
            Register client
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="card text-center text-text-secondary py-12 text-sm">
          No clients registered yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <div key={client.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{client.name}</h3>
                    <span className="badge-neutral">{client.type}</span>
                    <span className={client.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}>
                      {client.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-tertiary">{client.slug}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-text-tertiary w-28 shrink-0">Client ID</span>
                  <code className="font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded break-all">
                    {client.clientId}
                  </code>
                </div>
                {client.scopes?.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-tertiary w-28 shrink-0">Scopes</span>
                    <div className="flex gap-1 flex-wrap">
                      {client.scopes.map((scope, i) => (
                        <code key={i} className="font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded">
                          {scope}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {client.redirectUris?.length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-text-tertiary w-28 shrink-0 pt-0.5">Redirect URIs</span>
                    <div className="space-y-1">
                      {client.redirectUris.map((uri, i) => (
                        <code
                          key={i}
                          className="block font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded break-all"
                        >
                          {uri}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                {client.postLogoutRedirectUris?.length > 0 && (
                  <div className="flex items-start gap-2 text-xs">
                    <span className="text-text-tertiary w-28 shrink-0 pt-0.5">Logout URIs</span>
                    <div className="space-y-1">
                      {client.postLogoutRedirectUris.map((uri, i) => (
                        <code
                          key={i}
                          className="block font-mono text-text-secondary bg-surface-2 px-2 py-0.5 rounded break-all"
                        >
                          {uri}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Client Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Client">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="My Application"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="input-field font-mono"
              placeholder="my-app"
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input-field"
            >
              <option value="PUBLIC">Public</option>
              <option value="CONFIDENTIAL">Confidential</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Redirect URIs <span className="text-text-tertiary">(one per line)</span>
            </label>
            <textarea
              value={redirectUris}
              onChange={(e) => setRedirectUris(e.target.value)}
              className="input-field min-h-[80px] font-mono text-xs"
              placeholder={"https://myapp.yaotoshi.xyz/callback\nhttp://localhost:3000/callback"}
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Post-Logout Redirect URIs <span className="text-text-tertiary">(one per line)</span>
            </label>
            <textarea
              value={postLogoutRedirectUris}
              onChange={(e) => setPostLogoutRedirectUris(e.target.value)}
              className="input-field min-h-[80px] font-mono text-xs"
              placeholder={"https://myapp.yaotoshi.xyz\nhttp://localhost:3000"}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Secret Modal */}
      <Modal
        open={!!createdSecret}
        onClose={() => setCreatedSecret(null)}
        title="Client Secret"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Copy this secret now. It will not be shown again.
          </p>
          <code className="block font-mono text-sm bg-surface-2 px-4 py-3 rounded-lg break-all text-text-primary">
            {createdSecret}
          </code>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setCreatedSecret(null)}>
              Done
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
