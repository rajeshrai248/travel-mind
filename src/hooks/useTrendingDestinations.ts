import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { getTrendingDestinations } from '../lib/trendingService';
import type { TrendingDestination } from '../types';

export function useTrendingDestinations() {
  const { user } = useAuthStore();
  const [destinations, setDestinations] = useState<TrendingDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getTrendingDestinations(user.uid)
      .then((results) => {
        if (!cancelled) setDestinations(results);
      })
      .catch((err) => {
        console.error('[Trending] Failed to fetch:', err);
        if (!cancelled) setError('Failed to load trending destinations');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  return { destinations, loading, error };
}
