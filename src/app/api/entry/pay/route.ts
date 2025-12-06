/**
 * DEPRECATED: This endpoint was a placeholder and is no longer used.
 * Entry flow uses /api/starter/verify instead.
 * 
 * Returns 501 Not Implemented to indicate this is intentionally disabled.
 */

import { jsonError, withErrorHandling } from '@/lib/api/http';

export async function POST(): Promise<Response> {
  return withErrorHandling(async () =>
    jsonError('This endpoint is deprecated. Use /api/starter/verify for entry flow.', 501)
  );
}
