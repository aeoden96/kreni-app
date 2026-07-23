/**
 * RouteDirectionHeader — "direction towards <terminus>" strip above the stop list.
 *
 * One row rather than a per-direction button pair: the terminus name alone reads
 * ambiguously, so the caption spells out that it is a direction. Shared by the
 * compact route panel and the expanded route view.
 */

import { ArrowLeftRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RouteDirectionHeaderProps {
  /** Caption above the name, already translated (e.g. "Smjer prema"). */
  caption: string;
  /** Accent colour of the active direction. */
  color: string;
  /** Terminus name of the active direction. */
  label: string;
  /** Omitted when the direction is pinned (journey context) or the line runs one way. */
  onSwitch?: () => void;
}

export function RouteDirectionHeader({
  caption,
  color,
  label,
  onSwitch,
}: RouteDirectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-lg border border-base-300 bg-base-200/40">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-base-content/50 leading-none">
          {caption}
        </div>
        <div className="text-sm font-bold leading-tight truncate mt-0.5" style={{ color }}>
          {label}
        </div>
      </div>
      {onSwitch && (
        <button
          aria-label={t('routeBar.switchDirection')}
          className="btn btn-ghost btn-circle btn-sm min-h-[36px] min-w-[36px] shrink-0"
          onClick={onSwitch}
          title={t('routeBar.switchDirection')}
          type="button"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
