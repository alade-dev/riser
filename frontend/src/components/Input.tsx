import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div
        className={`
          relative flex items-center
          bg-[var(--color-bg-tertiary)]
          border border-[var(--color-border-subtle)]
          rounded-lg
          transition-all duration-200
          focus-within:border-[var(--color-border-focus)]
          focus-within:ring-2 focus-within:ring-[var(--color-accent-glow)]
          ${error ? 'border-[var(--color-error)] focus-within:ring-[var(--color-error)]' : ''}
        `}
      >
        {leftIcon && <div className="pl-3 text-[var(--color-text-muted)]">{leftIcon}</div>}
        <input
          ref={ref}
          className={`
            w-full bg-transparent px-3 py-2.5 text-sm text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-muted)]
            focus:outline-none
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-0' : ''} ${rightIcon ? 'pr-0' : ''}
          `}
          {...props}
        />
        {rightIcon && <div className="pr-3 text-[var(--color-text-muted)]">{rightIcon}</div>}
      </div>
      {error && <p className="text-[10px] text-[var(--color-error)] font-medium">{error}</p>}
      {helper && !error && <p className="text-[10px] text-[var(--color-text-muted)]">{helper}</p>}
    </div>
  );
});

Input.displayName = 'Input';
