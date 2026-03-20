import { Map } from 'lucide-react';

export interface RealtimeLegendToggleIconProps {
  /** Popover / panel is open — stronger emphasis on the icon */
  open: boolean;
}

/**
 * Map icon for the realtime status bar legend toggle (primary button).
 */
export function RealtimeLegendToggleIcon({ open }: RealtimeLegendToggleIconProps) {
  const className = [
    'w-4 h-4 shrink-0 text-primary-content transition-transform duration-200',
    open ? 'scale-110 drop-shadow-sm' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <Map className={className} strokeWidth={2.25} aria-hidden />;
}
