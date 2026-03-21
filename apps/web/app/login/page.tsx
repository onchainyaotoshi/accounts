'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { AuthLayout } from '@/components/auth-layout';

function isAllowedRedirect(url: string): boolean {
  // Allow relative paths (reject protocol-relative URLs like //evil.com)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
    if (appDomain && (hostname === appDomain || hostname.endsWith(`.${appDomain}`))) {
      return true;
    }
  } catch {
    // Invalid URL, reject
  }
  return false;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);

      if (redirectParam && isAllowedRedirect(redirectParam)) {
        // Use window.location for full navigation (needed for OAuth redirects
        // that may involve server-side handling on /authorize)
        window.location.href = redirectParam;
      } else {
        router.replace('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          placeholder="Enter your password"
          required
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
      <div className="flex items-center justify-between text-sm pt-2">
        <Link
          href="/forgot-password"
          className="text-text-secondary hover:text-accent transition-colors"
        >
          Forgot password?
        </Link>
        <Link
          href="/signup"
          className="text-accent hover:text-accent-bright transition-colors"
        >
          Create account
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthLayout title="Sign in" subtitle={`Access your ${process.env.NEXT_PUBLIC_APP_NAME || 'Accounts'} account`}>
      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
