"use client";
import React, { useState, useEffect, useRef } from "react";
import LeaderboardTable from "../../components/LeaderboardTable";

interface LeaderboardEntry {
  address: string;
  count: number;
}

interface FullLeaderboardEntry {
  address: string;
  count: number; // wallet balance
  locked: number; // locked balance
  total: number; // wallet + locked
}

const TABS = [
  { label: "Lazy Lions", key: "lions" },
  { label: "Lazy Cubs", key: "cubs" },
  { label: "$LAZY Token", key: "lazy" },
];

const LAZY_LIONS_CONTRACT = "0x8943c7bac1914c9a7aba750bf2b6b09fd21037e0";
const LAZY_CUBS_CONTRACT = "0xE6A9826E3B6638d01dE95B55690bd4EE7EfF9441";
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/nft/v2/${ALCHEMY_API_KEY}`;

console.log("Alchemy Key:", ALCHEMY_API_KEY)

async function fetchLazyLionsTopHolders(limit = 250) {
  // Alchemy does not provide a direct "top holders" endpoint, so we fetch all owners and count
  const res = await fetch(
    `${ALCHEMY_BASE_URL}/getOwnersForCollection?contractAddress=${LAZY_LIONS_CONTRACT}&withTokenBalances=true`
  );
  if (!res.ok) throw new Error("Failed to fetch holders");
  const data = await res.json();
  // data.ownerAddresses is an array of { ownerAddress, tokenBalances: [{ tokenId, balance }] }
  const counts = data.ownerAddresses.map((owner: { ownerAddress: string; tokenBalances: { tokenId: string; balance: string }[] }) => ({
    address: owner.ownerAddress,
    count: owner.tokenBalances.length,
  }));
  // Sort by count descending
  counts.sort((a: { count: number }, b: { count: number }) => b.count - a.count);
  return counts.slice(0, limit);
}

async function fetchLazyCubsTopHolders(limit = 250) {
  const res = await fetch(
    `${ALCHEMY_BASE_URL}/getOwnersForCollection?contractAddress=${LAZY_CUBS_CONTRACT}&withTokenBalances=true`
  );
  if (!res.ok) throw new Error("Failed to fetch holders");
  const data = await res.json();
  const counts = data.ownerAddresses.map((owner: { ownerAddress: string; tokenBalances: { tokenId: string; balance: string }[] }) => ({
    address: owner.ownerAddress,
    count: owner.tokenBalances.length,
  }));
  counts.sort((a: { count: number }, b: { count: number }) => b.count - a.count);
  return counts.slice(0, limit);
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("lions");
  const [lions, setLions] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;
  const [ensNames, setEnsNames] = useState<Record<string, string | null>>({});
  const [cubs, setCubs] = useState<LeaderboardEntry[]>([]);
  const [cubsLoading, setCubsLoading] = useState(false);
  const [cubsError, setCubsError] = useState("");
  const [cubsPage, setCubsPage] = useState(1);
  const [cubsEnsNames, setCubsEnsNames] = useState<Record<string, string | null>>({});
  const [fullTokenHolders, setFullTokenHolders] = useState<FullLeaderboardEntry[]>([]);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [tokenPage, setTokenPage] = useState(1);
  const [tokenEnsNames, setTokenEnsNames] = useState<Record<string, string | null>>({});
  const TOKEN_PAGE_SIZE = 50;
  const [sortKey, setSortKey] = useState<'count' | 'locked' | 'total'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const prevTab = useRef(activeTab);

  useEffect(() => {
    if (activeTab === "lions") {
      setLoading(true);
      setError("");
      fetchLazyLionsTopHolders(250)
        .then(setLions)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
      setPage(1);
    } else if (activeTab === "cubs") {
      setCubsLoading(true);
      setCubsError("");
      fetchLazyCubsTopHolders(250)
        .then(setCubs)
        .catch((e) => setCubsError(e.message))
        .finally(() => setCubsLoading(false));
      setCubsPage(1);
    } else if (activeTab === "lazy") {
      setTokenLoading(true);
      setTokenError("");
      fetchLockedBalancesFromCreatorBid()
        .then(async (lockedMap) => {
          const allHolders = await fetchFirstNPagesSequentially(10, TOKEN_PAGE_SIZE, lockedMap);
          setFullTokenHolders(allHolders);
        })
        .catch((e) => setTokenError(e.message))
        .finally(() => setTokenLoading(false));
    }
  }, [activeTab]);

  // Only reset tokenPage to 1 when the tab actually changes to 'lazy'
  useEffect(() => {
    if (activeTab === "lazy" && prevTab.current !== "lazy") {
      setTokenPage(1);
    }
    prevTab.current = activeTab;
  }, [activeTab]);

  // ENS name resolution for visible addresses (Lions)
  useEffect(() => {
    const addresses = lions.map((entry) => entry.address);
    if (addresses.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ens-lookup-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        const data = await res.json();
        if (data.logs) data.logs.forEach((log: string) => console.log(log));
        if (!cancelled && data.ensNames) setEnsNames(data.ensNames);
      } catch {
        // Optionally handle error
      }
    })();
    return () => { cancelled = true; };
  }, [lions]);

  // ENS name resolution for visible addresses (paginated Lions)
  useEffect(() => {
    const addresses = lions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => entry.address);
    if (addresses.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ens-lookup-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        const data = await res.json();
        if (data.logs) data.logs.forEach((log: string) => console.log(log));
        if (!cancelled && data.ensNames) setEnsNames(data.ensNames);
      } catch {
        // Optionally handle error
      }
    })();
    return () => { cancelled = true; };
  }, [page, lions]);

  // ENS name resolution for visible addresses (Cubs)
  useEffect(() => {
    const addresses = cubs.map((entry) => entry.address);
    if (addresses.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ens-lookup-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        const data = await res.json();
        if (data.logs) data.logs.forEach((log: string) => console.log(log));
        if (!cancelled && data.ensNames) setCubsEnsNames(data.ensNames);
      } catch {
        // Optionally handle error
      }
    })();
    return () => { cancelled = true; };
  }, [cubs]);

  // ENS name resolution for visible addresses (paginated Cubs)
  useEffect(() => {
    const addresses = cubs.slice((cubsPage - 1) * PAGE_SIZE, cubsPage * PAGE_SIZE).map((entry) => entry.address);
    if (addresses.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ens-lookup-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        const data = await res.json();
        if (data.logs) data.logs.forEach((log: string) => console.log(log));
        if (!cancelled && data.ensNames) setCubsEnsNames(data.ensNames);
      } catch {
        // Optionally handle error
      }
    })();
    return () => { cancelled = true; };
  }, [cubsPage, cubs]);

  // ENS name resolution for visible addresses (Token)
  useEffect(() => {
    const addresses = fullTokenHolders.map((entry) => entry.address);
    if (addresses.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ens-lookup-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses }),
        });
        const data = await res.json();
        if (data.logs) data.logs.forEach((log: string) => console.log(log));
        if (!cancelled && data.ensNames) setTokenEnsNames(data.ensNames);
      } catch {
        // Optionally handle error
      }
    })();
    return () => { cancelled = true; };
  }, [fullTokenHolders]);

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  }

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + maxPagesToShow - 1);
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    return (
      <div className="flex items-center justify-center mt-8 space-x-4">
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
        >
          Prev
        </button>
        {pageNumbers.map((num) => (
          <button
            key={num}
            style={{ backgroundColor: '#c9a25f' }}
            className={`text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110${num === page ? '' : ''}`}
            onClick={() => handlePageChange(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    );
  }

  function renderPaginationCubs() {
    if (totalCubsPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, cubsPage - 2);
    const end = Math.min(totalCubsPages, start + maxPagesToShow - 1);
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    return (
      <div className="flex items-center justify-center mt-8 space-x-4">
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => setCubsPage(cubsPage - 1)}
          disabled={cubsPage === 1}
        >
          Prev
        </button>
        {pageNumbers.map((num) => (
          <button
            key={num}
            style={{ backgroundColor: '#c9a25f' }}
            className={`text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110${num === cubsPage ? '' : ''}`}
            onClick={() => setCubsPage(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => setCubsPage(cubsPage + 1)}
          disabled={cubsPage === totalCubsPages}
        >
          Next
        </button>
      </div>
    );
  }

  function renderPaginationToken() {
    if (totalTokenPages <= 1) return null;
    const pageNumbers = [];
    const maxPagesToShow = 5;
    let start = Math.max(1, tokenPage - 2);
    const end = Math.min(totalTokenPages, start + maxPagesToShow - 1);
    if (end - start < maxPagesToShow - 1) {
      start = Math.max(1, end - maxPagesToShow + 1);
    }
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    return (
      <div className="flex items-center justify-center mt-8 space-x-4">
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => setTokenPage(tokenPage - 1)}
          disabled={tokenPage === 1}
        >
          Prev
        </button>
        {pageNumbers.map((num) => (
          <button
            key={num}
            style={{ backgroundColor: '#c9a25f' }}
            className={`text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110${num === tokenPage ? '' : ''}`}
            onClick={() => setTokenPage(num)}
          >
            {num}
          </button>
        ))}
        <button
          style={{ backgroundColor: '#c9a25f' }}
          className="text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110"
          onClick={() => setTokenPage(tokenPage + 1)}
          disabled={tokenPage === totalTokenPages}
        >
          Next
        </button>
      </div>
    );
  }

  async function fetchLazyTokenTopHoldersFromChainbase(page = 1, pageSize = 50, lockedMap: Record<string, number> = {}) {
    const url = `/api/chainbase-token-holders?page=${page}&limit=${pageSize}`;
    console.log("Fetching Chainbase URL:", url);
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to fetch token holders from Chainbase", res.status, res.statusText);
      throw new Error("Failed to fetch token holders from Chainbase");
    }
    const data = await res.json();
    console.log("Raw Chainbase API data:", data);
    if (data.data && Array.isArray(data.data)) {
      const mapped = data.data.map((holder: { wallet_address: string; amount: string }, idx: number) => {
        if (idx < 5) {
          console.log("Raw holder", idx, holder);
        }
        const address = holder.wallet_address.toLowerCase();
        const wallet = Math.round(Number(holder.amount));
        const locked = lockedMap[address] || 0;
        return {
          address,
          count: wallet,
          locked,
          total: wallet + locked,
        };
      });
      console.log("Mapped holders (first 5):", mapped.slice(0, 5));
      // Try to get total from data.total or data.total_count, fallback to mapped.length
      const total = data.total || data.total_count || data.pagination?.total || mapped.length;
      return { holders: mapped, total };
    } else {
      console.error("No data returned from Chainbase", data);
      throw new Error("No data returned from Chainbase");
    }
  }

  async function fetchLockedBalancesFromCreatorBid() {
    // Replace with the correct agentId for $LAZY (likely the contract address)
    const agentId = "673cfa0e5ace33e545076103";
    const url = `https://creator.bid/api/agents/${agentId}/members?page=1&limit=1000`;
    const res = await fetch(url);
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch locked balances from CreatorBid: ${res.status} ${errorText}`);
    }
    const data = await res.json();
    const lockedMap: Record<string, number> = {};
    if (data.members && Array.isArray(data.members)) {
      data.members.forEach((member: { address: string; amountLocked: string }) => {
        lockedMap[member.address.toLowerCase()] = Math.round(Number(member.amountLocked));
      });
    }
    return lockedMap;
  }

  function handleSortChange(key: 'count' | 'locked' | 'total') {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  }

  const sortedTokenHolders = [...fullTokenHolders].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortKey] - b[sortKey];
    } else {
      return b[sortKey] - a[sortKey];
    }
  });

  if (activeTab === "lazy") {
    console.log("Token Holders Page Data:", fullTokenHolders);
  }

  // Convert lions and cubs to FullLeaderboardEntry[] for LeaderboardTable
  const paginatedLionsFull: FullLeaderboardEntry[] = lions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({
    ...entry,
    locked: 0,
    total: entry.count,
  }));
  const paginatedCubsFull: FullLeaderboardEntry[] = cubs.slice((cubsPage - 1) * PAGE_SIZE, cubsPage * PAGE_SIZE).map((entry) => ({
    ...entry,
    locked: 0,
    total: entry.count,
  }));

  function isErrorWithMessage(e: unknown): e is { message: string } {
    return typeof e === 'object' && e !== null && 'message' in e && typeof (e as { message?: unknown }).message === 'string';
  }

  async function fetchFirstNPagesSequentially(n: number, pageSize: number, lockedMap: Record<string, number>) {
    let allHolders: FullLeaderboardEntry[] = [];
    for (let page = 1; page <= n; page++) {
      let success = false;
      while (!success) {
        try {
          const { holders } = await fetchLazyTokenTopHoldersFromChainbase(page, pageSize, lockedMap);
          allHolders = allHolders.concat(holders);
          success = true;
          // Wait 300ms between requests to avoid rate limit
          await new Promise(res => setTimeout(res, 300));
        } catch (e: unknown) {
          if (isErrorWithMessage(e) && e.message.includes('429')) {
            // Wait 2 seconds and retry
            await new Promise(res => setTimeout(res, 2000));
          } else {
            throw e;
          }
        }
      }
    }
    return allHolders;
  }

  const totalPages = Math.ceil(lions.length / PAGE_SIZE);
  const totalCubsPages = Math.ceil(cubs.length / PAGE_SIZE);
  const totalTokenPages = Math.ceil(fullTokenHolders.length / TOKEN_PAGE_SIZE);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="max-w-4xl w-full">
        <h1 className="text-2xl font-extrabold mb-2 mt-2 text-center text-gray-100 tracking-tight drop-shadow-lg">Lazy Leaderboards</h1>
        <div className="mb-2" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              style={{ backgroundColor: '#c9a25f' }}
              className={`text-white font-semibold uppercase tracking-wide rounded-xl px-8 py-3 transition-all hover:brightness-110${activeTab === tab.key ? '' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {activeTab === "lions" && (
          error ? (
            <div className="text-red-400 text-center text-lg py-8">{error}</div>
          ) : (
            <>
              <div>
                <LeaderboardTable
                  entries={paginatedLionsFull}
                  mode="lions"
                  loading={loading}
                  startRank={(page - 1) * PAGE_SIZE + 1}
                  ensNames={ensNames}
                />
              </div>
              <div className="mt-1 flex justify-center" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>{renderPagination()}</div>
            </>
          )
        )}
        {activeTab === "cubs" && (
          cubsError ? (
            <div className="text-red-400 text-center text-lg py-8">{cubsError}</div>
          ) : (
            <>
              <div>
                <LeaderboardTable
                  entries={paginatedCubsFull}
                  mode="cubs"
                  loading={cubsLoading}
                  startRank={(cubsPage - 1) * PAGE_SIZE + 1}
                  ensNames={cubsEnsNames}
                />
              </div>
              <div className="mt-1 flex justify-center" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>{renderPaginationCubs()}</div>
            </>
          )
        )}
        {activeTab === "lazy" && (
          tokenError ? (
            <div className="text-red-400 text-center text-lg py-8">{tokenError}</div>
          ) : (
            <>
              <div>
                <LeaderboardTable
                  entries={sortedTokenHolders as FullLeaderboardEntry[]}
                  mode="lazy"
                  loading={tokenLoading}
                  startRank={(tokenPage - 1) * TOKEN_PAGE_SIZE + 1}
                  ensNames={tokenEnsNames}
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>
              <div className="mt-1 flex justify-center" style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>{renderPaginationToken()}</div>
            </>
          )
        )}
      </div>
    </div>
  );
} 