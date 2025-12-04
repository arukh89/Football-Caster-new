'use client';

import { useState, useEffect } from 'react';
import { quickAuth } from '@farcaster/miniapp-sdk';
import type { FarcasterIdentity } from '@/lib/types';
import { useIsInFarcaster } from '@/hooks/useIsInFarcaster';

/**
 * Hook to get Farcaster identity using the SDK
 * Uses the official Farcaster API with API key
 */
export function useFarcasterIdentity(): {
  identity: FarcasterIdentity | null;
  isLoading: boolean;
  error: string | null;
} {
  const [identity, setIdentity] = useState<FarcasterIdentity | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isInFarcaster = useIsInFarcaster();

  useEffect(() => {
    let mounted = true;

    const fetchIdentity = async (): Promise<void> => {
      try {
        // In Farcaster, use QuickAuth; otherwise use plain fetch (dev fallback on server)
        const res = isInFarcaster
          ? await quickAuth.fetch('/api/auth/me')
          : await fetch('/api/auth/me');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) {
          const ident: FarcasterIdentity = { fid: Number(data.fid) };
          setIdentity(ident);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch Farcaster identity:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    };

    fetchIdentity();

    return () => {
      mounted = false;
    };
  }, [isInFarcaster]);

  return { identity, isLoading, error };
}
