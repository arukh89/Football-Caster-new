import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpSubmitResult } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, conflict, forbidden, ok } from '@/lib/api/http'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json()) as { matchId?: string; result?: any }
    const matchId = String(body?.matchId || '')
    const result = body?.result ?? {}
    if (!matchId) return badRequest('invalid_match')
    await stPvpSubmitResult(matchId, ctx.fid, result)
    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
