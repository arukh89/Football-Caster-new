import { ok, jsonError, withErrorHandling } from '@/lib/api/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return withErrorHandling(async () => {
    const { getSpacetime } = await import('@/lib/spacetime/client');
    await getSpacetime();
    return ok({ status: 'healthy', spacetime: 'connected' });
  });
}
