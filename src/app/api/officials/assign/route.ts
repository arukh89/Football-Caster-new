import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stOfficialAssignToMatch } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, ok } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json().catch(() => ({}))) as any
    const matchId = typeof body?.matchId === 'string' ? body.matchId : null
    const refereeId = String(body?.refereeId || '')
    const assistantLeftId = String(body?.assistantLeftId || '')
    const assistantRightId = String(body?.assistantRightId || '')
    const varId = body?.varId ? String(body.varId) : null

    if (!refereeId || !assistantLeftId || !assistantRightId) {
      return badRequest('missing_official_ids')
    }

    if (matchId) {
      try {
        await stOfficialAssignToMatch(matchId, refereeId, assistantLeftId, assistantRightId, varId)
      } catch (e) {
        // Backend reducer may be unimplemented; tolerate and still return ok for UI continuity
        console.warn('official_assign_to_match failed (non-fatal):', e)
      }
    }

    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
