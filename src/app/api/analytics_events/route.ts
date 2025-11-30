import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'edge'

export async function OPTIONS(): Promise<Response> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
      'Access-Control-Max-Age': '600',
    },
  })
}

export async function POST(_req: NextRequest): Promise<Response> {
  // Explicitly no-op to avoid third-party analytics CORS issues
  return new NextResponse(null, { status: 204 })
}
