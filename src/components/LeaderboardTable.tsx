import React from "react";

interface FullLeaderboardEntry {
  address: string;
  count: number; // wallet balance
  locked: number; // locked balance
  total: number; // wallet + locked
}

interface LeaderboardTableProps {
  entries: FullLeaderboardEntry[];
  loading?: boolean;
  startRank?: number;
  ensNames?: Record<string, string | null>;
  sortKey?: 'count' | 'locked' | 'total';
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (key: 'count' | 'locked' | 'total') => void;
  mode?: 'lions' | 'cubs' | 'lazy';
}

const LP_ADDRESS = "0x4356dd25897d8a804a7c7af024d27229d21d3bef".toLowerCase();
const CONTRACT_ADDRESS = "0xe4da9889db3d1987856e56da08ec7e9f484f6434".toLowerCase();
const BURN_ADDRESS = "0x000000000000000000000000000000000000dead".toLowerCase();

export default function LeaderboardTable({ entries, loading, startRank = 1, ensNames, sortKey, sortDirection, onSortChange, mode = 'lazy' }: LeaderboardTableProps) {
  const renderSortArrow = (key: 'count' | 'locked' | 'total') => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="flex flex-col items-center justify-center py-2">
      <div className="mx-auto max-w-6xl w-full overflow-x-auto px-2">
        <table className="mx-auto w-full border-2 border-gray-700 rounded-xl shadow-2xl text-center text-gray-100 text-sm" style={{ backgroundColor: '#032B44' }}>
          <thead className="bg-[#23272e]">
            <tr className="bg-[#23272e] text-sm text-gray-100 align-middle">
              <th className="px-2 py-1 text-center font-bold">Rank</th>
              <th className="px-2 py-1 text-center font-bold">Address / ENS</th>
              {mode === 'lazy' ? (
                <>
                  <th className="px-2 py-1 text-center font-bold cursor-pointer" onClick={() => onSortChange && onSortChange('count')}>$LAZY in Wallet{renderSortArrow('count')}</th>
                  <th className="px-2 py-1 text-center font-bold cursor-pointer" onClick={() => onSortChange && onSortChange('locked')}>$LAZY Locked{renderSortArrow('locked')}</th>
                  <th className="px-2 py-1 text-center font-bold cursor-pointer" onClick={() => onSortChange && onSortChange('total')}>$LAZY Total{renderSortArrow('total')}</th>
                </>
              ) : (
                <th className="px-2 py-1 font-bold min-w-[120px]" style={{ textAlign: 'center' }}>NFTs Owned</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={mode === 'lazy' ? 5 : 3} className="text-center py-4 text-sm">Loading...</td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={mode === 'lazy' ? 5 : 3} className="text-center py-4 text-sm">No data found.</td>
              </tr>
            ) : (
              entries.map((entry, idx) => (
                <tr key={entry.address + '-' + idx} className="border-t border-b-2 border-gray-800 hover:bg-[#23272e] transition-all align-middle">
                  <td className="px-2 py-1 font-semibold text-center">{startRank + idx}</td>
                  <td className="px-2 py-1 font-mono break-all text-center">
                    <span
                      className={ensNames && ensNames[entry.address] ? "font-semibold text-blue-300" : ""}
                      title={entry.address}
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(entry.address); }}
                      style={{ cursor: 'pointer' }}
                    >
                      {ensNames && ensNames[entry.address]
                        ? `${ensNames[entry.address]}`
                        : `0x...${entry.address.slice(-5)}`}
                    </span>
                    {entry.address.toLowerCase() === LP_ADDRESS && (
                      <span className="ml-2 px-2 py-1 bg-yellow-300 text-black text-xs rounded">LP Pool</span>
                    )}
                    {entry.address.toLowerCase() === CONTRACT_ADDRESS && (
                      <span className="ml-2 px-2 py-1 bg-blue-300 text-black text-xs rounded">Locked</span>
                    )}
                    {entry.address.toLowerCase() === BURN_ADDRESS && (
                      <span className="ml-2 px-2 py-1 bg-red-600 text-white text-xs rounded">Burned</span>
                    )}
                  </td>
                  {mode === 'lazy' ? (
                    <>
                      <td className="px-2 py-1 text-center">{typeof entry.count === "number" ? entry.count.toLocaleString() : ""}</td>
                      <td className="px-2 py-1 text-center">{typeof entry.locked === "number" ? entry.locked.toLocaleString() : ""}</td>
                      <td className="px-2 py-1 font-bold text-center">{typeof entry.total === "number" ? entry.total.toLocaleString() : ""}</td>
                    </>
                  ) : (
                    <td className="px-2 py-1 min-w-[120px]" style={{ textAlign: 'center' }}>{typeof entry.count === "number" ? entry.count.toLocaleString() : ""}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 