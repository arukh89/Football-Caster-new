/**
 * POST /api/auth/link
 * Link Farcaster FID to wallet address
 */

import { type NextRequest } from 'next/server';
import { stLinkWallet } from '@/lib/spacetime/api';
import { validate, linkWalletSchema } from '@/lib/middleware/validation';
import { withErrorHandling, validateBody, ok } from '@/lib/api/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, linkWalletSchema);
    if (!parsed.ok) return parsed.res;

    const { fid, wallet } = parsed.data;
    await stLinkWallet(fid, wallet);

    return ok({ success: true, token: `${fid}:${wallet.toLowerCase()}`, fid, wallet: wallet.toLowerCase() });
  });
}
