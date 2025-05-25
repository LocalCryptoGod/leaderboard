import { Handler } from '@netlify/functions';
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
const TOKEN_PAGE_SIZE = 50;
const TOKEN_PAGES = 10;

async function fetchOwners(contract: string) {
  const res = await fetch(
    `${ALCHEMY_BASE_URL}/getOwnersForCollection?contractAddress=${contract}&withTokenBalances=true`
  );
  if (!res.ok) throw new Error("Failed to fetch holders");
  const data = await res.json();
  return data.ownerAddresses.map((owner: { ownerAddress: string }) => owner.ownerAddress);
}

async function fetchLazyTokenTopHoldersFromChainbase(page = 1, pageSize = 50) {
  const url = `${process.env.URL || ''}/api/chainbase-token-holders?page=${page}&limit=${pageSize}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch token holders from Chainbase");
  }
  const data = await res.json();
  if (data.data && Array.isArray(data.data)) {
    return data.data.map((holder: { wallet_address: string }) => holder.wallet_address.toLowerCase());
  } else {
    throw new Error("No data returned from Chainbase");
  }
}

async function fetchAllTokenHolders() {
  let allHolders: string[] = [];
  for (let page = 1; page <= TOKEN_PAGES; page++) {
    try {
      const holders = await fetchLazyTokenTopHoldersFromChainbase(page, TOKEN_PAGE_SIZE);
      allHolders = allHolders.concat(holders);
      await new Promise(res => setTimeout(res, 300)); // Match frontend delay
    } catch {
      break;
    }
  }
  return Array.from(new Set(allHolders));
}

export const handler: Handler = async () => {
  try {
    const lionAddresses = await fetchOwners(LAZY_LIONS_CONTRACT);
    const cubAddresses = await fetchOwners(LAZY_CUBS_CONTRACT);
    const tokenAddresses = await fetchAllTokenHolders();
    const allAddresses = Array.from(new Set([...lionAddresses, ...cubAddresses, ...tokenAddresses]));

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
        await new Promise(res => setTimeout(res, 100));
      } else {
        if (ensName) ensCount++;
      }
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ processed: allAddresses.length, ensFound: ensCount }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: (e as Error).message }),
    };
  }
};

export const config = {
  schedule: '50 20 * * *', // Every day at 20:50 UTC (3:50 PM EST)
}; 