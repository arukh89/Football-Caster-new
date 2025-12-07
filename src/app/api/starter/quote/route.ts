/**
 * POST /api/starter/quote
 * Get quote for starter pack ($1 in FBC)
 */

import { ok, withErrorHandling } from '@/lib/api/http';
import { getQuote } from '@/lib/services/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  return withErrorHandling(async () => {
    const starterPriceUSD = process.env.NEXT_PUBLIC_STARTER_PACK_PRICE_USD || '1';
    const quote = await getQuote(starterPriceUSD);
    return ok({ amountWei: quote.amountWei, priceUsd: quote.priceUsd, usdAmount: starterPriceUSD });
  });
}
