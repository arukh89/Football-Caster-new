/**
 * GET /api/inbox - Get inbox messages
 * POST /api/inbox - Mark messages as read
 */

import { type NextRequest } from 'next/server';
import { stGetInbox, stInboxMarkRead } from '@/lib/spacetime/api';
import { requireAuth } from '@/lib/middleware/auth';
import { validate, markReadSchema } from '@/lib/middleware/validation';
import { ok, cache, withErrorHandling, validateBody } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    const all = await stGetInbox(ctx.fid);
    const messages = unreadOnly ? all.filter((m: any) => !m.readAtMs) : all;
    return ok({ messages }, { headers: cache.privateNoStore });
  });
}

async function postHandler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const parsed = await validateBody(req, markReadSchema);
    if (!parsed.ok) return parsed.res;

    const { ids } = parsed.data;
    await stInboxMarkRead(ctx.fid, ids);
    return ok({ success: true });
  });
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
