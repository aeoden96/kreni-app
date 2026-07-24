/**
 * Shared full-screen modal shell: dimmed backdrop + centered card.
 * Presentational only — the caller is responsible for portalling this into
 * document.body (e.g. via BadgeWithPanel's fullScreen variant or createPortal).
 */

import type { ReactNode } from 'react';

interface FullScreenModalCardProps {
  /** id of the element that labels the dialog (usually the header title/tab bar). */
  ariaLabelledBy?: string;
  children: ReactNode;
  onClose: () => void;
}

export function FullScreenModalCard({
  ariaLabelledBy,
  children,
  onClose,
}: FullScreenModalCardProps) {
  return (
    <div className="fixed inset-0 z-[3200] flex items-start justify-center">
      <div
        aria-hidden
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      <div
        aria-labelledby={ariaLabelledBy}
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90dvh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        role="dialog"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {children}
      </div>
    </div>
  );
}
