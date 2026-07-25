import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The moon that marks a night-only line, sized to sit inside a route badge.
 *
 * Drops into any existing badge without touching its classes: it carries its own
 * left margin rather than relying on the parent's `gap`, which varies across the
 * badge sizes in use (badge-xs through badge-lg). Callers guard on
 * `isNightRoute()`; this component just draws.
 *
 * The map draws its badges as an HTML string for a Leaflet DivIcon and so cannot
 * use this — it repeats the glyph as NIGHT_MOON_SVG in StopMarkers.tsx.
 */
export function NightMoon({ className = 'w-3 h-3' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <>
      <Moon
        aria-hidden="true"
        className={`inline-block ml-0.5 shrink-0 align-[-0.1em] ${className}`}
        fill="currentColor"
      />
      <span className="sr-only">{t('search.nightLine')}</span>
    </>
  );
}
