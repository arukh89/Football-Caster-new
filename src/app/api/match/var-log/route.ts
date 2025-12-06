import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stVarReviewRecord } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, ok } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json().catch(() => ({}))) as any
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null
    const tsMs = Number(body?.tsMs || Date.now())
    const decision = String(body?.decision || '')
    const reason = String(body?.reason || '')
    const metaJson = JSON.stringify(body?.meta ?? {})

    if (!matchId || !decision) {
      return badRequest('missing_params')
    }

    try {
      await stVarReviewRecord(matchId, tsMs, decision, reason, metaJson)
    } catch (e) {
      console.warn('var_review_record failed (non-fatal):', e)
    }

    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
