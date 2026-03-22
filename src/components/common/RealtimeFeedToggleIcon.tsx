import { Activity } from 'lucide-react';

interface RealtimeFeedToggleIconProps {
  /** Technical details popover is open */
  open: boolean;
  /**
   * Client feed sync time (ms). When this value changes, the icon subtree remounts
   * so the CSS `realtime-data-refresh-tick` / dot flash run once — no extra React state.
   */
  lastUpdate: number | null;
}

/**
 * Activity icon + live-status dot for the realtime feed / technical-details toggle.
 */
export function RealtimeFeedToggleIcon({ open, lastUpdate }: RealtimeFeedToggleIconProps) {
  const activityClass = [
    'relative z-[1] w-4 h-4 shrink-0 text-success-content transition-transform duration-200',
    'realtime-data-refresh-tick',
    open ? 'scale-110 drop-shadow-sm' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span key={lastUpdate ?? 'none'} className="contents">
      <Activity className={activityClass} strokeWidth={2.25} aria-hidden />
      <span
        className="absolute top-1 right-1 z-[2] h-2 w-2 rounded-full bg-white shadow-sm animate-pulse realtime-feed-dot-refresh"
        aria-hidden
      />
    </span>
  );
}
