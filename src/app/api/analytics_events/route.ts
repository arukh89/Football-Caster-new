import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'

function isAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null
  try {
    const url = new URL(origin)
    const host = url.host
    if (
      host === 'warpcast.com' ||
      host === 'www.warpcast.com' ||
      host === 'client.warpcast.com' ||
      host.endsWith('.warpcast.com') ||
      host === 'client.farcaster.xyz' ||
      host.endsWith('.farcaster.xyz') ||
      host.endsWith('.vercel.app')
    ) return origin
  } catch {}
  return null
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = isAllowedOrigin(req.headers.get('origin'))
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  return headers
}

export async function OPTIONS(req: NextRequest): Promise<Response> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) })
}

export async function POST(req: NextRequest): Promise<Response> {
  // No-op sink to avoid third-party analytics CORS/CORB issues
  const res = new NextResponse(null, { status: 204 })
  const headers = corsHeaders(req)
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v)
  return res
}
