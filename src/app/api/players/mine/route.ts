import type { NextRequest } from 'next/server';
import type { Player } from '@/lib/types';
import { stGetPlayersMine } from '@/lib/spacetime/api';
import { requireAuth } from '@/lib/middleware/auth';
import { ok, cache, withErrorHandling } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/players/mine?fid=123
async function handler(_req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const players: Player[] = await stGetPlayersMine(ctx.fid);
    return ok({ players }, { headers: cache.privateNoStore });
  });
}

export const GET = requireAuth(handler);
