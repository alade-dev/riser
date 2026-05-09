import React from 'react';
import { IconShield } from './Icons';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
}) => {
  const variants = {
    default: 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)]',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    accent: 'bg-[var(--color-accent-surface)] text-[var(--color-accent-primary)] border-[var(--color-accent-glow)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium border rounded-full tracking-wide
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {icon}
      {children}
    </span>
  );
};

// Specialized badge for privacy type
export const PrivacyBadge: React.FC<{ type: 'Private' | 'Wallet' }> = ({ type }) => (
  <Badge variant="accent" size="sm" icon={<IconShield className="w-3 h-3" />}>
    {type}
  </Badge>
);

// Token badge
interface TokenBadgeProps {
  token: 'ETH' | 'USDT';
  size?: 'sm' | 'md';
}

export const TokenBadge: React.FC<TokenBadgeProps> = ({ token, size = 'sm' }) => {
  const colors = {
    ETH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    USDT: 'bg-green-500/10 text-green-400 border-green-500/20',
  };

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] border
        ${colors[token]}
        ${size === 'md' ? 'text-xs px-2.5 py-1' : ''}
      `}
    >
      {token}
    </span>
  );
};
