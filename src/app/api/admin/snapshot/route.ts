/**
 * POST /api/admin/snapshot
 * Generate weekly snapshot (for cron)
 */

import { withErrorHandling, ok, forbidden } from '@/lib/api/http';
import { requireAuth, isDevFID } from '@/lib/middleware/auth';
// Snapshot disabled in SpacetimeDB architecture; Vercel serverless cannot write to FS

export const runtime = 'nodejs';

async function handler(_: Request, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const enabled = process.env.ENABLE_ADMIN_ENDPOINTS === 'true';
    if (!enabled || !isDevFID(ctx.fid)) return forbidden('Forbidden');
    return ok({ success: true, message: 'Snapshot disabled under SpacetimeDB' });
  });
}

export const POST = requireAuth(handler);
