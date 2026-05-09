import React from 'react';
import { IconCheck, IconAlertTriangle, IconX } from './Icons';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
  };

  const Icon = type === 'success' ? IconCheck : IconAlertTriangle;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg
        ${styles[type]}
      `}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
      >
        <IconX className="w-4 h-4" />
      </button>
    </div>
  );
};
