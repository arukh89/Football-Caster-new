import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpAccept } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, forbidden, conflict, ok } from '@/lib/api/http'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json()) as { matchId?: string }
    const matchId = String(body?.matchId || '')
    if (!matchId) return badRequest('invalid_match')
    await stPvpAccept(matchId, ctx.fid)
    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
