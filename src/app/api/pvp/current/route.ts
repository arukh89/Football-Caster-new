import { NextResponse, type NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { getSpacetime } from '@/lib/spacetime/client'
import { stGetPlayersMine } from '@/lib/spacetime/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(req: NextRequest, ctx: { fid: number }): Promise<Response> {
  try {
    const st = await getSpacetime()
    const fid = ctx.fid

    // Try to find latest active match for this user
    const active = (await st.query(
      `SELECT * FROM pvp_match WHERE (challenger_fid = ${fid} OR challenged_fid = ${fid}) AND status = 'active' ORDER BY accepted_at_ms DESC LIMIT 1`
    )) as any[]

    let match = active?.[0]
    let pending = false

    // If no active match, surface latest pending (for UI awareness)
    if (!match) {
      const pend = (await st.query(
        `SELECT * FROM pvp_match WHERE (challenger_fid = ${fid} OR challenged_fid = ${fid}) AND status = 'pending' ORDER BY created_at_ms DESC LIMIT 1`
      )) as any[]
      match = pend?.[0]
      pending = !!match
    }

    if (!match) {
      return NextResponse.json(
        { match: null },
        { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
      )
    }

    const opponentFid: number = match.challenger_fid === fid ? match.challenged_fid : match.challenger_fid
    const opponentPlayers = await stGetPlayersMine(opponentFid)

    return NextResponse.json(
      {
        match: {
          id: match.id,
          challengerFid: match.challenger_fid,
          challengedFid: match.challenged_fid,
          status: match.status,
          createdAtMs: match.created_at_ms,
          acceptedAtMs: match.accepted_at_ms ?? null,
          pending,
        },
        opponent: { fid: opponentFid, players: opponentPlayers },
      },
      { headers: { 'Cache-Control': 'private, no-store, no-cache, must-revalidate' } }
    )
  } catch (e) {
    console.error('pvp/current error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export const GET = requireAuth(handler)
