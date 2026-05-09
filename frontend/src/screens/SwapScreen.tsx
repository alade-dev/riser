import React from 'react';
import { Button } from '../components/Button';
import { IconSwap } from '../components/Icons';

interface SwapScreenProps {
  selectedToken: 'ETH' | 'USDT';
  onTokenChange: (token: 'ETH' | 'USDT') => void;
  publicBalance: string;
  privateBalance: string;
  swapInputAmount: string;
  onSwapInputChange: (value: string) => void;
  onSwap: () => void;
  loading: boolean;
  isWrapping?: boolean;
  onToggleWrap?: () => void;
  connected: boolean;
  onConnect: () => void;
  walletBusy?: boolean;
}

export const SwapScreen: React.FC<SwapScreenProps> = ({
  selectedToken,
  onTokenChange,
  publicBalance,
  privateBalance,
  swapInputAmount,
  onSwapInputChange,
  onSwap,
  loading,
  isWrapping = true,
  onToggleWrap,
  connected,
  onConnect,
  walletBusy = false,
}) => {
  const estimatedOutput = swapInputAmount ? parseFloat(swapInputAmount).toFixed(4) : '0.0000';
  const tokenImg = selectedToken === 'ETH' ? "/images/eth.png" : "/images/usdt.png";

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 py-2 sm:py-3">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
          {isWrapping ? 'Wrap (Shield)' : 'Unwrap (Unshield)'} Token
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {connected ? (
            isWrapping ? (
              'Convert public ERC-20 tokens to confidential ERC-7984 tokens (1:1).'
            ) : (
              'Unwrap confidential ERC-7984 tokens back to public ERC-20 tokens (1:1).'
            )
          ) : (
            'Connect your wallet to wrap or unwrap. No chain requests run until you connect.'
          )}
        </p>
      </div>

      {/* Token Selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-1 rounded-full gap-1">
          <button
            onClick={() => onTokenChange('ETH')}
            className={`
              flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all
              ${selectedToken === 'ETH'
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}
            `}
          >
            <img src="/images/eth.png" alt="ETH" className="w-4 h-4 object-contain rounded-full" />
            <span>ETH</span>
          </button>
          <button
            onClick={() => onTokenChange('USDT')}
            className={`
              flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-full transition-all
              ${selectedToken === 'USDT'
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--text-primary)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}
            `}
          >
            <img src="/images/usdt.png" alt="USDT" className="w-4 h-4 object-contain rounded-full" />
            <span>USDT</span>
          </button>
        </div>
      </div>

      {/* Swap Card */}
      <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-2xl p-6 space-y-4">

        {/* Pay Section */}
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold mb-3">
            <span>{isWrapping ? 'Public Token (Pay)' : 'Confidential Token (Pay)'}</span>
            <span>{isWrapping ? 'Public Balance' : 'Private Balance'}: {isWrapping ? publicBalance : privateBalance}</span>
          </div>
          <div className="flex justify-between items-center">
            <input
              type="number"
              placeholder="0.00"
              value={swapInputAmount}
              onChange={(e) => onSwapInputChange(e.target.value)}
              disabled={!connected}
              className="bg-transparent border-none text-2xl font-bold text-[var(--color-text-primary)] focus:outline-none w-2/3 font-mono placeholder:text-[var(--color-text-muted)] appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-2 bg-[var(--color-border-subtle)] px-3.5 py-1.5 rounded-full border border-[var(--color-border-light)]">
              <img src={tokenImg} alt={selectedToken} className="w-3.5 h-3.5 object-contain rounded-full" />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">{isWrapping ? selectedToken : `c${selectedToken}`}</span>
            </div>
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center -my-2 cursor-pointer" onClick={onToggleWrap}>
          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-accent-primary)] shadow-md hover:bg-[var(--color-bg-surface)] transition-colors">
            <IconSwap className="w-4 h-4" />
          </div>
        </div>

        {/* Receive Section */}
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] rounded-xl p-4.5">
          <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] font-semibold mb-3">
            <span>{isWrapping ? 'Confidential Token (Receive)' : 'Public Token (Receive)'}</span>
            <span>{isWrapping ? 'Private Balance' : 'Public Balance'}: {isWrapping ? privateBalance : publicBalance}</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
              {estimatedOutput}
            </div>
            <div className="flex items-center gap-2 bg-[var(--color-border-subtle)] px-3.5 py-1.5 rounded-full border border-[var(--color-border-light)]">
              <img src={tokenImg} alt={selectedToken} className="w-3.5 h-3.5 object-contain rounded-full" />
              <span className="text-xs font-bold text-[var(--color-text-primary)]">{isWrapping ? `c${selectedToken}` : selectedToken}</span>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="flex justify-between items-center text-xs text-[var(--color-text-muted)] px-1 font-semibold">
          <span>Exchange Rate</span>
          <span className="text-[var(--color-text-secondary)] font-mono">1 {selectedToken} = 1 c{selectedToken}</span>
        </div>

        {/* Swap Button */}
        <Button
          onClick={connected ? onSwap : onConnect}
          loading={connected ? loading : walletBusy}
          disabled={connected ? (!swapInputAmount || parseFloat(swapInputAmount) <= 0) : walletBusy}
          className="w-full bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover,#4f46e5)] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[var(--color-accent-glow)]"
        >
          {connected
            ? isWrapping
              ? 'Wrap to Confidential Token'
              : 'Unwrap to Public Token'
            : 'Connect Wallet'}
        </Button>
      </div>
    </div>
  );
};
