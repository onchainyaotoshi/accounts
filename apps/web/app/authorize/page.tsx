'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { user as userApi } from '@/lib/api';

function AuthorizeFlow() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Checking authentication...');

  useEffect(() => {
    async function handleAuthorize() {
      const queryString = searchParams.toString();

      if (!searchParams.get('client_id') || !searchParams.get('redirect_uri')) {
        setError('Missing required OAuth parameters (client_id, redirect_uri)');
        return;
      }

      if (!searchParams.get('code_challenge')) {
        setError('Missing required PKCE parameter (code_challenge)');
        return;
      }

      // Step 1: Check if user is logged in
      try {
        await userApi.me();
      } catch {
        // Not logged in - redirect to login with return URL
        const currentPath = `/authorize?${queryString}`;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        return;
      }

      // Step 2: User is authenticated - navigate to the API's /authorize via proxy
      // The API will validate params, create an auth code, and return a 302 redirect
      // to the client's redirect_uri with the authorization code.
      // The browser follows the redirect natively.
      setStatus('Redirecting...');
      window.location.href = `/api/proxy/authorize?${queryString}`;
    }

    handleAuthorize();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="card max-w-md w-full mx-4">
          <h1 className="text-lg font-semibold text-text-primary mb-2">Authorization Error</h1>
          <p className="text-sm text-danger">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="card max-w-md w-full mx-4 text-center">
        <p className="text-sm text-text-secondary">{status}</p>
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg-primary">
          <div className="card max-w-md w-full mx-4 text-center">
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      }
    >
      <AuthorizeFlow />
    </Suspense>
  );
}
