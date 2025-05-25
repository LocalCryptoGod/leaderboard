import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }
  const key = `ens:${address.toLowerCase()}`;
  // Try to get from cache
  let ensName = await redis.get<string>(key);
  if (ensName !== null) {
    return NextResponse.json({ ensName });
  }
  // Not in cache, resolve
  try {
    ensName = await provider.lookupAddress(address);
    // Cache for 24 hours (86400 seconds)
    await redis.set(key, ensName, { ex: 86400 });
    return NextResponse.json({ ensName });
  } catch {
    return NextResponse.json({ ensName: null, error: 'Failed to resolve ENS' }, { status: 500 });
  }
} 