import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface BatchRequestBody {
  addresses: string[];
  filter?: string; // filter by ENS or address substring
  sortBy?: 'address' | 'ens';
  sortDirection?: 'asc' | 'desc';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BatchRequestBody;
    if (!Array.isArray(body.addresses)) {
      return NextResponse.json({ error: 'addresses must be an array' }, { status: 400 });
    }
    let results: { address: string; ens: string | null }[] = [];
    for (const address of body.addresses) {
      const key = `ens:${address.toLowerCase()}`;
      const ens = await redis.get<string>(key);
      results.push({ address, ens: ens ?? null });
    }
    // Filtering
    if (body.filter) {
      const filter = body.filter.toLowerCase();
      results = results.filter(({ address, ens }) =>
        address.toLowerCase().includes(filter) || (ens && ens.toLowerCase().includes(filter))
      );
    }
    // Sorting
    if (body.sortBy) {
      const dir = body.sortDirection === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        const aVal = body.sortBy === 'address' ? a.address : (a.ens || '');
        const bVal = body.sortBy === 'address' ? b.address : (b.ens || '');
        return aVal.localeCompare(bVal) * dir;
      });
    }
    // Return as mapping for easy frontend use
    const ensNames: Record<string, string | null> = {};
    for (const { address, ens } of results) {
      ensNames[address] = ens;
    }
    return NextResponse.json({ ensNames });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process batch ENS lookup', details: String(e) }, { status: 500 });
  }
} 