/**
 * GET /api/auth/me
 * Resolve the currently authenticated Farcaster user
 * - In Farcaster: uses QuickAuth JWT via authenticate()
 * - In development: falls back to dev identity when enabled
 */

import { NextResponse, type NextRequest } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest): Promise<Response> {
  const ctx = await authenticate(req);
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ fid: ctx.fid, wallet: ctx.wallet });
}
