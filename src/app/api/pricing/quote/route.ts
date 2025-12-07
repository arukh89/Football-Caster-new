/**
 * POST /api/pricing/quote
 * Get FBC amount quote for USD value
 */

import { type NextRequest } from 'next/server';
import { getQuote } from '@/lib/services/pricing';
import { validate, quoteSchema } from '@/lib/middleware/validation';
import { withErrorHandling, validateBody, ok } from '@/lib/api/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, quoteSchema);
    if (!parsed.ok) return parsed.res;

    const { usd } = parsed.data;
    const quote = await getQuote(usd);
    return ok(quote);
  });
}
