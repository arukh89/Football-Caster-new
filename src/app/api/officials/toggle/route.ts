import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stOfficialSetActive } from '@/lib/spacetime/api'
import { withErrorHandling, badRequest, ok } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    const body = (await req.json().catch(() => ({}))) as any
    const officialId = String(body?.officialId || '')
    const active = Boolean(body?.active)
    if (!officialId) return badRequest('missing_id')
    try {
      await stOfficialSetActive(officialId, active)
    } catch (e) {
      console.warn('official_set_active failed (non-fatal):', e)
    }
    return ok({ ok: true })
  })
}

export const POST = requireAuth(handler)
