import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { AuthContext } from '@/lib/middleware/auth'
import { stOfficialCreate } from '@/lib/spacetime/api'
import { withErrorHandling, ok } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function rand(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)) }

async function tryCreate(role: string) {
  const aiSeed = rand(1, 10_000)
  const strictness = rand(40, 90)
  const advantageTendency = rand(30, 80)
  const offsideTolerance = rand(40, 85)
  const varPropensity = rand(20, 70)
  const consistency = rand(50, 95)
  const fitness = rand(60, 95)
  const reputation = rand(40, 90)
  try {
    await stOfficialCreate(role, aiSeed, strictness, advantageTendency, offsideTolerance, varPropensity, consistency, fitness, reputation)
    return { ok: true }
  } catch (e) {
    // Reducer may be unimplemented; ignore
    return { ok: false, error: String(e) }
  }
}

async function handler(req: NextRequest, _ctx: AuthContext): Promise<Response> {
  return withErrorHandling(async () => {
    const countParam = Number((await req.json().catch(() => ({})))?.count ?? 4)
    const wantsVar = countParam >= 4
    const results: any[] = []
    // Always attempt at least a full crew
    results.push(await tryCreate('referee'))
    results.push(await tryCreate('assistant_left'))
    results.push(await tryCreate('assistant_right'))
    if (wantsVar) results.push(await tryCreate('var'))
    return ok({ ok: true, attempted: results.length })
  })
}

export const POST = requireAuth(handler)
