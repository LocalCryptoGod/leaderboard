import { NextRequest, NextResponse } from 'next/server';

const CHAINBASE_API_KEY = process.env.CHAINBASE_API_KEY;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '50';
  const url = `https://api.chainbase.online/v1/token/top-holders?chain_id=8453&contract_address=0xe4da9889db3d1987856e56da08ec7e9f484f6434&page=${page}&limit=${limit}`;

  const chainbaseRes = await fetch(url, {
    headers: {
      'x-api-key': CHAINBASE_API_KEY!,
      'accept': 'application/json'
    }
  });
  const data = await chainbaseRes.json();
  return NextResponse.json(data);
}