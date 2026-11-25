import React from 'react';
import { CheckCircle2, Coins, AlertTriangle, Info, X } from 'lucide-react';
import { useGame, type ToastKind } from '@/state/GameContext';

function ToastIcon({ kind }: { kind: ToastKind }) {
  switch (kind) {
    case 'success':
      return <CheckCircle2 size={18} color="#16a34a" />;
    case 'gold':
      return <Coins size={18} color="#d97706" />;
    case 'error':
      return <AlertTriangle size={18} color="#dc2626" />;
    default:
      return <Info size={18} color="#2563eb" />;
  }
}

export const ToastLayer: React.FC = () => {
  const { toasts, dismissToast } = useGame();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-layer" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item ${toast.kind !== 'info' ? `toast-item--${toast.kind}` : ''}`}
        >
          <span style={{ flexShrink: 0, display: 'inline-flex' }}>
            <ToastIcon kind={toast.kind} />
          </span>
          <span style={{ flex: 1, lineHeight: 1.3 }}>{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fermer la notification"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 4,
              display: 'inline-flex',
              color: 'var(--ink-muted)',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
