import React from 'react';

interface BalanceCardProps {
  ethBalance: string;
  usdtBalance: string;
  onRefresh: () => void;
  loading?: boolean;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  ethBalance,
  usdtBalance,
  onRefresh,
  loading = false,
}) => {
  return (
    <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-4 sm:p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Confidential Balances (ERC-7984)
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
        >
          <svg
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/images/eth.png" alt="ETH" className="w-5 h-5 object-contain rounded-full opacity-80" />
            <span className="text-xs font-bold text-[var(--color-accent-primary)]">Confidential ETH</span>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
            {parseFloat(ethBalance).toFixed(4)}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">cETH</div>
        </div>

        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] rounded-xl p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/images/usdt.png" alt="USDT" className="w-5 h-5 object-contain rounded-full opacity-80" />
            <span className="text-xs font-bold text-emerald-400">Confidential USDT</span>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">
            {parseFloat(usdtBalance).toFixed(2)}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1">cUSDT</div>
        </div>
      </div>
    </div>
  );
};
