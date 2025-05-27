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
  const logs: string[] = [];
  try {
    const body = (await req.json()) as BatchRequestBody;
    logs.push(`[ENS-BATCH] Incoming body: ${JSON.stringify(body)}`);
    if (!Array.isArray(body.addresses)) {
      logs.push(`[ENS-BATCH] addresses is not an array: ${body.addresses}`);
      return NextResponse.json({ error: 'addresses must be an array', logs }, { status: 400 });
    }
    let results: { address: string; ens: string | null }[] = [];
    for (const address of body.addresses) {
      const key = `ens:${address.toLowerCase()}`;
      try {
        const ens = await redis.get<string>(key);
        results.push({ address, ens: ens ?? null });
        logs.push(`[ENS-BATCH] ${address} => ${ens ?? 'null'}`);
      } catch (e) {
        logs.push(`[ENS-BATCH] Redis error for address ${address}: ${String(e)}`);
        results.push({ address, ens: null });
      }
    }
    // Filtering
    if (body.filter) {
      const filter = body.filter.toLowerCase();
      results = results.filter(({ address, ens }) =>
        address.toLowerCase().includes(filter) || (ens && ens.toLowerCase().includes(filter))
      );
      logs.push(`[ENS-BATCH] Filtered results with filter: ${body.filter}`);
    }
    // Sorting
    if (body.sortBy) {
      const dir = body.sortDirection === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        const aVal = body.sortBy === 'address' ? a.address : (a.ens || '');
        const bVal = body.sortBy === 'address' ? b.address : (b.ens || '');
        return aVal.localeCompare(bVal) * dir;
      });
      logs.push(`[ENS-BATCH] Sorted results by: ${body.sortBy} (${body.sortDirection})`);
    }
    // Return as mapping for easy frontend use
    const ensNames: Record<string, string | null> = {};
    for (const { address, ens } of results) {
      ensNames[address] = ens;
    }
    logs.push(`[ENS-BATCH] Returning ensNames for ${results.length} addresses`);
    return NextResponse.json({ ensNames, logs });
  } catch (e) {
    logs.push(`[ENS-BATCH] Error: ${String(e)}`);
    return NextResponse.json({ error: 'Failed to process batch ENS lookup', details: String(e), logs }, { status: 500 });
  }
} 