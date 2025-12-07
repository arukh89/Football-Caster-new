import { type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stCommentaryAppend } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, ok } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json().catch(() => ({}))) as any
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null
    const tsMs = Number(body?.tsMs || Date.now())
    const tone = (body?.tone || 'calm') as string
    const lang = (body?.lang || 'id') as string
    const text = String(body?.text || '')
    const metaJson = JSON.stringify(body?.meta ?? {})

    if (!matchId || !text) {
      return badRequest('missing_params')
    }

    try {
      await stCommentaryAppend(matchId, tsMs, tone, lang, text, metaJson)
    } catch (e) {
      // Reducer may be stubbed; allow UI to continue
      console.warn('commentary_append failed (non-fatal):', e)
    }

    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
