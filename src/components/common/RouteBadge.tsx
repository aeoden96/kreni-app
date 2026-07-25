import { useTranslation } from 'react-i18next';

import type { Route } from '../../utils/gtfs';

import { isNightRoute } from '../../utils/nightLines';
import { routeBadgeColor } from '../../utils/routeStyle';
import { NightMoon } from './NightMoon';

interface RouteBadgeProps {
  /** Extra classes for the badge itself (sizing, min-width, …). */
  className?: string;
  /**
   * Background override for day lines, where the caller already has a colour of
   * its own (the search list tints by active filter, not by route type). Night
   * lines ignore it — their night colour is the whole point.
   */
  color?: string;
  /**
   * Dim the badge to mark a line that is not running at this hour. Only ever set
   * for night lines during the day — a night line is still fully selectable,
   * this just stops it competing with lines you can actually board right now.
   */
  dimmed?: boolean;
  /** Overrides the displayed text (train numbers stand in for the short name). */
  label?: string;
  route: Route;
}

/**
 * A route's number as a fully-styled coloured badge, moon included for
 * night-only lines.
 *
 * Use this where a badge is being written fresh. Badges that already exist with
 * their own bespoke classes instead drop a bare <NightMoon /> inside themselves —
 * same glyph, no restyling. The map is a third case: it builds badges as an HTML
 * string for a Leaflet DivIcon, so it repeats the glyph as NIGHT_MOON_SVG in
 * StopMarkers.tsx and the colour in index.css under `.spider-route-badge.is-night`.
 */
export function RouteBadge({
  className = '',
  color,
  dimmed = false,
  label,
  route,
}: RouteBadgeProps) {
  const { t } = useTranslation();
  const night = isNightRoute(route);

  return (
    <span
      className={`badge font-bold text-white ${dimmed ? 'opacity-50' : ''} ${className}`}
      style={{
        backgroundColor: night ? routeBadgeColor(route) : (color ?? routeBadgeColor(route)),
      }}
      title={night ? t('search.nightLine') : undefined}
    >
      {label ?? route.shortName}
      {night && <NightMoon />}
    </span>
  );
}
