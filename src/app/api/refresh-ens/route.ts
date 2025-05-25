import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { ethers } from 'ethers';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`);

const LAZY_LIONS_CONTRACT = "0x8943c7bac1914c9a7aba750bf2b6b09fd21037e0";
const LAZY_CUBS_CONTRACT = "0xE6A9826E3B6638d01dE95B55690bd4EE7EfF9441";
const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}`;

async function fetchOwners(contract: string) {
  const res = await fetch(
    `${ALCHEMY_BASE_URL}/getOwnersForCollection?contractAddress=${contract}&withTokenBalances=true`
  );
  if (!res.ok) throw new Error("Failed to fetch holders");
  const data = await res.json();
  return data.ownerAddresses.map((owner: { ownerAddress: string }) => owner.ownerAddress);
}

async function fetchTokenHolders() {
  // This should match your /api/chainbase-token-holders logic
  const holders: string[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/chainbase-token-holders?page=${page}&limit=50`);
    if (!res.ok) break;
    const data = await res.json();
    if (data.data && Array.isArray(data.data)) {
      holders.push(...data.data.map((h: { wallet_address: string }) => h.wallet_address.toLowerCase()));
    } else {
      break;
    }
  }
  return holders;
}

export async function GET() {
  try {
    // 1. Fetch all addresses
    const lionAddresses = await fetchOwners(LAZY_LIONS_CONTRACT);
    const cubAddresses = await fetchOwners(LAZY_CUBS_CONTRACT);
    const tokenAddresses = await fetchTokenHolders();
    const allAddresses = Array.from(new Set([...lionAddresses, ...cubAddresses, ...tokenAddresses]));

    // 2. Resolve ENS and store in Redis
    let ensCount = 0;
    for (const address of allAddresses) {
      const key = `ens:${address.toLowerCase()}`;
      let ensName = await redis.get<string>(key);
      if (ensName === null) {
        try {
          ensName = await provider.lookupAddress(address);
          await redis.set(key, ensName, { ex: 86400 });
          if (ensName) ensCount++;
        } catch {
          await redis.set(key, null, { ex: 86400 });
        }
        // Optional: add a small delay to avoid rate limits
        await new Promise(res => setTimeout(res, 100));
      } else {
        if (ensName) ensCount++;
      }
    }
    return NextResponse.json({ processed: allAddresses.length, ensFound: ensCount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
} 