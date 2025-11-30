import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { stPvpSubmitResult } from '@/lib/spacetime/api'

export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const body = (await req.json()) as { matchId?: string; result?: any }
    const matchId = String(body?.matchId || '')
    const result = body?.result ?? {}
    if (!matchId) return NextResponse.json({ error: 'invalid_match' }, { status: 400 })
    await stPvpSubmitResult(matchId, ctx.fid, result)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = typeof e === 'string' ? e : (e as any)?.message || ''
    if (msg && String(msg).includes('invalid_state')) {
      return NextResponse.json({ error: 'invalid_state' }, { status: 409 })
    }
    if (msg && String(msg).includes('not_participant')) {
      return NextResponse.json({ error: 'not_participant' }, { status: 403 })
    }
    if (msg && String(msg).includes('invalid_json')) {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }
    if (msg && (String(msg).includes('missing_home') || String(msg).includes('missing_away'))) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
    }
    if (msg && String(msg).includes('negative_score')) {
      return NextResponse.json({ error: 'negative_score' }, { status: 400 })
    }
    if (msg && String(msg).includes('score_out_of_range')) {
      return NextResponse.json({ error: 'score_out_of_range' }, { status: 400 })
    }
    console.error('pvp/submit_result error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const POST = requireAuth(handler)
