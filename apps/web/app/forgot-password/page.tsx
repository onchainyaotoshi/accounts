'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { AuthLayout } from '@/components/auth-layout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send you a link to reset your password"
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-success/10 border border-success/20 px-4 py-3 text-sm text-success">
            If an account with that email exists, we sent a password reset link.
            Check your inbox.
          </div>
          <Link href="/login" className="btn-ghost w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
          <div className="text-center text-sm pt-2">
            <Link
              href="/login"
              className="text-text-secondary hover:text-accent transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
