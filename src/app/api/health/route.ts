import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getSpacetime } = await import('@/lib/spacetime/client');
    await getSpacetime();
    return NextResponse.json({ status: 'healthy', spacetime: 'connected' });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: String(error?.message || error) },
      { status: 503 }
    );
  }
}
