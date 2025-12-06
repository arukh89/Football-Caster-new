/**
 * GET /api/starter/status
 * Returns whether the current user has claimed the starter pack
 */

import { type NextRequest } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';
import { stHasClaimedStarter } from '@/lib/spacetime/api';
import { ok, unauthorized, withErrorHandling } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    // Prefer authenticated fid when available
    const ctx = await authenticate(req);
    let fid: number | null = ctx?.fid ?? null;

    // Allow explicit fid via headers (e.g., x-fid) for read-only status checks
    if (!fid) {
      const fidHeader = parseInt(req.headers.get('x-fid') || '', 10);
      if (Number.isFinite(fidHeader)) fid = fidHeader;
    }

    // Allow fid via query param as a last resort
    if (!fid) {
      const url = new URL(req.url);
      const fidParam = parseInt(url.searchParams.get('fid') || '', 10);
      if (Number.isFinite(fidParam)) fid = fidParam;
    }

    if (!fid) return unauthorized();

    const hasClaimed = await stHasClaimedStarter(fid);
    return ok({ hasClaimed });
  });
}
