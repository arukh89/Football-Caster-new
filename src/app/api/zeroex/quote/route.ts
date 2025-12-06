/**
 * GET /api/zeroex/quote
 * Server-side proxy to 0x Base API (bypasses browser CSP)
 */

import type { NextRequest } from 'next/server';
import { ok, withErrorHandling, jsonError } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function HEAD(): Promise<Response> {
  return new Response(null, { status: 204 });
}

export async function GET(req: NextRequest): Promise<Response> {
  return withErrorHandling(async () => {
    const upstream = new URL('https://base.api.0x.org/swap/v1/quote');
    const sp = req.nextUrl.searchParams;
    // Forward all query params
    for (const [k, v] of sp.entries()) upstream.searchParams.append(k, v);

    const res = await fetch(upstream.toString(), {
      headers: {
        accept: 'application/json',
        'user-agent': 'FootballCaster/1.0 (+server-proxy)'
      },
      cache: 'no-store',
    });

    const bodyText = await res.text();
    try {
      const json = JSON.parse(bodyText);
      return ok(json, { status: res.status });
    } catch {
      return new Response(bodyText, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') || 'text/plain' },
      });
    }
  });
}
