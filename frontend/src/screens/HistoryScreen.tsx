import React from 'react';
import { PrivacyBadge } from '../components/Badge';
import { Button } from '../components/Button';

const SEPOLIA_TX_BASE = 'https://sepolia.etherscan.io/tx';

interface HistoryItem {
  id: string;
  action: string;
  token: string;
  amount: string;
  type: 'Private' | 'Wallet';
  status: 'Completed' | 'Pending' | 'Failed';
  txHash: string;
  timestamp: string;
}

interface HistoryScreenProps {
  items: HistoryItem[];
  connected: boolean;
  onConnect: () => void;
  walletBusy?: boolean;
}

function formatHistoryTime(timestamp: string): string {
  const ms = Date.parse(timestamp);
  if (!Number.isNaN(ms)) return new Date(ms).toLocaleString();
  return timestamp;
}

function truncateHash(hash: string): string {
  const h = hash.startsWith('0x') ? hash : `0x${hash}`;
  if (h.length <= 18) return h;
  return `${h.slice(0, 10)}…${h.slice(-8)}`;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  items,
  connected,
  onConnect,
  walletBusy = false,
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 py-1 sm:py-2">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
          Cryptographic Ledger
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {connected
            ? 'Confidential ERC-7984 activity and public ERC-20 movements (wrap, transfers) involving your address. One row per transaction. Open a row on Etherscan for full detail.'
            : 'Connect your wallet to load history from the chain. Nothing is fetched until you connect.'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg-tertiary)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)] uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Asset</th>
                <th className="px-5 py-3 font-semibold text-right">Amount</th>
                <th className="px-5 py-3 font-semibold text-center">Privacy</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] text-[var(--color-text-secondary)]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    {!connected ? (
                      <div className="flex flex-col items-center gap-4">
                        <p className="text-[var(--color-text-muted)] max-w-sm">
                          Wallet not connected. Connect to fetch your Sepolia FHEVM transaction history.
                        </p>
                        <Button
                          variant="primary"
                          size="md"
                          onClick={onConnect}
                          disabled={walletBusy}
                          loading={walletBusy}
                        >
                          Connect Wallet
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[var(--color-text-muted)]">
                        No transactions yet. Send, wrap, or unwrap to see completed activity here.
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const fullHash = item.txHash.startsWith('0x') ? item.txHash : `0x${item.txHash}`;
                  const explorerUrl = `${SEPOLIA_TX_BASE}/${fullHash}`;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--color-bg-tertiary)]/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-text-primary)]">{item.action}</span>
                          <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            {formatHistoryTime(item.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <img
                            src={item.token === 'ETH' ? '/images/eth.png' : '/images/usdt.png'}
                            alt={item.token}
                            className="w-4 h-4 object-contain rounded-full"
                          />
                          <span className="font-mono text-xs text-[var(--color-text-primary)]">{item.token}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-[var(--color-text-primary)]">
                        {item.amount}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <PrivacyBadge type={item.type} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        {item.status === 'Completed' && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
                            Completed
                          </span>
                        )}
                        {item.status === 'Pending' && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
                            Pending
                          </span>
                        )}
                        {item.status === 'Failed' && (
                          <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-500">
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-cyan-400 hover:text-cyan-300 hover:underline underline-offset-2"
                        >
                          {truncateHash(fullHash)}
                          <span className="ml-1.5 text-[10px] text-[var(--color-text-muted)]" aria-hidden>
                            ↗
                          </span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
