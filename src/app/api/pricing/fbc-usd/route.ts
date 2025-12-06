/**
 * GET /api/pricing/fbc-usd
 * Get current FBC/USD price
 */

import { ok, cache, withErrorHandling } from '@/lib/api/http';
import { getFBCPrice } from '@/lib/services/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  return withErrorHandling(async () => {
    const priceData = await getFBCPrice();
    return ok(
      {
        priceUsd: priceData.priceUsd,
        source: priceData.source,
        timestamp: priceData.timestamp,
      },
      { headers: cache.privateNoStore }
    );
  });
}
