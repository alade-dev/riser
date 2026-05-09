import React from 'react';

interface NavBarProps {
  connected: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  address?: string;
  loading?: boolean;
  publicBalance?: string;
}

export const NavBar: React.FC<NavBarProps> = ({
  connected,
  onConnect,
  onDisconnect,
  address,
  loading = false,
  publicBalance = '0.0000',
}) => {
  const [copied, setCopied] = React.useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <nav className="shrink-0 z-50 mx-auto w-[95%] max-w-7xl mt-3 sm:mt-4 mb-2 sm:mb-3 bg-[var(--color-bg-primary)]/80 backdrop-blur-md border border-[var(--color-border-subtle)] rounded-2xl shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex items-center justify-between gap-4 min-h-[44px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <img
              src="/images/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-auto object-contain shrink-0"
              decoding="async"
            />
            <span className="text-sm font-bold text-[var(--color-text-primary)] tracking-tight leading-none">
              Riser
            </span>
          </div>

          {/* Wallet */}
          <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
            {connected && address ? (
              <div className="hidden sm:flex items-center gap-2">
                <div className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] h-9 px-3.5 rounded-full inline-flex items-center gap-2">
                  <img src="/images/eth.png" alt="" className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-mono font-bold text-[var(--color-text-primary)] leading-none whitespace-nowrap">
                    {publicBalance.slice(0, 6)} ETH
                  </span>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleCopy}
                  onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
                  className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] h-9 px-3.5 rounded-full inline-flex items-center gap-2 cursor-pointer hover:bg-[var(--color-bg-surface)] transition-colors max-w-[140px]"
                  title="Copy Address"
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs font-mono text-[var(--color-text-primary)] leading-none truncate">
                    {copied ? 'Copied!' : formatAddress(address)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onDisconnect}
                  className="bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:text-red-400 h-9 w-9 rounded-full inline-flex items-center justify-center transition-colors shrink-0"
                  title="Disconnect"
                  aria-label="Disconnect wallet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnect}
                disabled={loading}
                className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover,#4f46e5)] text-white text-xs font-semibold h-9 px-5 rounded-full inline-flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
