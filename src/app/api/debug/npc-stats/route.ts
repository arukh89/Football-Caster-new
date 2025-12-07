import { ok, withErrorHandling } from '@/lib/api/http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return withErrorHandling(async () => {
    const { getSpacetime, getEnv, reducers } = await import('@/lib/spacetime/client')
    const st: any = await getSpacetime()
    const r: any = await reducers()

    const env = getEnv()

    const userNpcCount = Array.from(st.db.user.iter()).filter((u: any) => u.isNpc === true).length
    const npcRegistryCount = Array.from(st.db.npcRegistry.iter()).length
    const assignmentCount = Array.from(st.db.npcAssignment.iter()).length
    const inventoryNpcItems = Array.from(st.db.inventoryItem.iter()).filter((x: any) => x.itemType === 'npc_manager').length

    const reducerKeys = Object.getOwnPropertyNames(r).filter((k) => typeof (r as any)[k] === 'function')
    return ok({ ok: true, env, counts: { userNpcCount, npcRegistryCount, assignmentCount, inventoryNpcItems }, reducerKeys })
  })
}
