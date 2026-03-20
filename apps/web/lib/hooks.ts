'use client';

import { useEffect, useState, useCallback } from 'react';
import { user, type User, ApiRequestError } from './api';

export function useUser() {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const me = await user.me();
      setData(me);
      setError(null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.statusCode === 401) {
        setData(null);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user: data, loading, error, refresh };
}
