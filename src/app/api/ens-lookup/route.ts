import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  console.log('[ENS-LOOKUP] Incoming request for address:', address);
  if (!address) {
    console.error('[ENS-LOOKUP] Missing address parameter');
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }
  const key = `ens:${address.toLowerCase()}`;
  try {
    const ensName = await redis.get<string>(key);
    if (ensName !== null) {
      console.log(`[ENS-LOOKUP] Cache hit for ${address}:`, ensName);
      return NextResponse.json({ ensName, cache: 'hit' });
    }
    console.log(`[ENS-LOOKUP] Cache miss for ${address}. No live lookup performed.`);
    return NextResponse.json({ ensName: null, cache: 'miss' });
  } catch (e) {
    console.error('[ENS-LOOKUP] Error for address', address, ':', e);
    return NextResponse.json({ ensName: null, error: 'Failed to read ENS from cache', details: String(e), address }, { status: 500 });
  }
} 