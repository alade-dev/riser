import React from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { IconWallet } from '../components/Icons';

interface SendScreenProps {
  selectedToken: 'ETH' | 'USDT';
  onTokenChange: (token: 'ETH' | 'USDT') => void;
  balanceA: string;
  balanceB: string;
  amountValue: string;
  onAmountChange: (value: string) => void;
  recipient: string;
  onRecipientChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  connected: boolean;
  onConnect: () => void;
  walletBusy?: boolean;
}

export const SendScreen: React.FC<SendScreenProps> = ({
  selectedToken,
  onTokenChange,
  balanceA,
  balanceB,
  amountValue,
  onAmountChange,
  recipient,
  onRecipientChange,
  onSend,
  loading,
  connected,
  onConnect,
  walletBusy = false,
}) => {
  const currentBalance = selectedToken === 'ETH' ? balanceA : balanceB;
  const maxAmount = parseFloat(currentBalance);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 py-2 sm:py-3">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
          How much?
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {connected
            ? `Enter the amount of ${selectedToken} you want to send.`
            : 'Connect your wallet to send confidential transfers. Your balances are not loaded until you connect.'}
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

      {/* Balance info */}
      <div className="flex items-center justify-center gap-1.5 text-sm text-[var(--color-text-muted)]">
        <IconWallet className="w-4 h-4 text-[var(--color-accent-primary)]" />
        <span>
          Balance:{' '}
          {connected ? `${maxAmount.toFixed(4)} ${selectedToken}` : '— (connect wallet)'}
        </span>
      </div>

      {/* Amount Input */}
      <div className="space-y-4">
        <input
          type="number"
          placeholder="0.00"
          value={amountValue}
          onChange={(e) => onAmountChange(e.target.value)}
          disabled={!connected}
          className="w-full text-center bg-transparent border-none text-4xl font-bold text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none font-mono py-2 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] px-4 py-1.5 rounded-full">
            <img 
              src={selectedToken === 'ETH' ? '/images/eth.png' : '/images/usdt.png'} 
              alt={selectedToken} 
              className="w-4 h-4 object-contain rounded-full" 
            />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">{selectedToken}</span>
          </div>
        </div>
      </div>

      {/* Quick percentages */}
      <div className="flex justify-center gap-3">
        {['25%', '50%', 'MAX'].map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={!connected}
            onClick={() => {
              const amount = pct === '25%'
                ? maxAmount * 0.25
                : pct === '50%'
                ? maxAmount * 0.5
                : maxAmount;
              onAmountChange(amount.toFixed(4));
            }}
            className="bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] text-xs font-medium text-[var(--color-text-secondary)] px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-subtle)]"
          >
            {pct}
          </button>
        ))}
      </div>

      {/* Recipient Input */}
      <div className="max-w-md mx-auto space-y-1.5 pt-4 border-t border-[var(--color-border-subtle)]">
        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          Recipient Address
        </label>
        <Input
          type="text"
          placeholder="0x..."
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          disabled={!connected}
          className="bg-[var(--color-bg-secondary)] border-[var(--color-border-subtle)] focus:border-[var(--color-accent-primary)] disabled:opacity-40"
        />
      </div>

      {/* Send Button */}
      <div className="max-w-md mx-auto pt-2">
        <Button
          onClick={connected ? onSend : onConnect}
          loading={connected ? loading : walletBusy}
          disabled={
            connected
              ? !amountValue || parseFloat(amountValue) <= 0 || !recipient
              : walletBusy
          }
          className="w-full bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover,#4f46e5)] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-[var(--color-accent-glow)]"
        >
          {connected
            ? `Send ${amountValue || '0.00'} ${selectedToken} Confidentially`
            : 'Connect Wallet'}
        </Button>
      </div>
    </div>
  );
};
