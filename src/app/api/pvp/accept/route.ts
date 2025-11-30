import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpAccept } from '@/lib/spacetime/api'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = (await req.json()) as { matchId?: string }
    const matchId = String(body?.matchId || '')
    if (!matchId) return NextResponse.json({ error: 'invalid_match' }, { status: 400 })
    await stPvpAccept(matchId, ctx.fid)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = typeof e === 'string' ? e : (e as any)?.message || ''
    if (msg && String(msg).includes('invalid_state')) {
      return NextResponse.json({ error: 'invalid_state' }, { status: 409 })
    }
    if (msg && String(msg).includes('not_challenged')) {
      return NextResponse.json({ error: 'not_challenged' }, { status: 403 })
    }
    console.error('pvp/accept error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
