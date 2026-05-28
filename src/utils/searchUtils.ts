/**
 * Pure helper functions for the SearchModal and its sub-components.
 */

import { Bus, TrainFront } from 'lucide-react';

import type { Route, Stop } from './gtfs';

import { bearingToCompassKey, isRouteTypeBus, isRouteTypeRail, isRouteTypeTram } from './gtfs';

export type FilterType = 'bus' | 'stanice' | 'trains' | 'tram';

export type ParentStopGroup = {
  key: string;
  representative: Stop;
  terminals: Stop[];
};

export type RecentMergedItem = RecentRouteItem | RecentStopItem;

export type RecentRouteItem = { data: Route; type: 'route' };
export type RecentStopItem = { data: Stop; type: 'stop' };
interface RecentItem {
  id: string;
  timestamp: number;
}

/**
 * Filters canonical parent stops for the directions stop-picker.
 * Returns the first 20 alphabetically sorted matches with a hasMore flag.
 */
export function filterParentStops(
  parentStops: Stop[],
  query: string
): { hasMore: boolean; stops: Stop[] } {
  const q = normalize(query.trim());
  const source = q ? parentStops.filter((s) => normalize(s.name).includes(q)) : parentStops;
  const sorted = source.slice().sort((a, b) => a.name.localeCompare(b.name));
  const limit = 20;
  return { hasMore: sorted.length > limit, stops: sorted.slice(0, limit) };
}

/**
 * Filters a source route list by the current search query.
 * Returns all routes when query is empty.
 */
export function filterRoutes(sourceRoutes: Route[], query: string): Route[] {
  if (!query.trim()) return sourceRoutes;
  const q = normalize(query);
  return sourceRoutes.filter(
    (route) => normalize(route.shortName).includes(q) || normalize(route.longName).includes(q)
  );
}

/** Returns the badge background colour for a route-type filter tab. */
export function getBadgeColor(filter: FilterType): string {
  if (filter === 'tram') return '#2563eb';
  if (filter === 'trains') return '#64748b';
  return '#d97706';
}

/** Returns the icon component and colour for a given platform stop route type. */
export function getStopTypeIcons(routeType?: number): { color: string; Icon: typeof TrainFront } {
  if (routeType === 3) return { color: '#d97706', Icon: Bus };
  if (routeType === 2) return { color: '#dc2626', Icon: TrainFront };
  return { color: '#2563eb', Icon: TrainFront };
}

/**
 * Groups platform stops (locationType === 0) by parent station or name, deduplicates by
 * compass direction, sorts, and returns the first 20 groups with a hasMore flag.
 */
export function groupPlatformStops(
  platformStops: Stop[],
  query: string
): { groups: ParentStopGroup[]; hasMore: boolean } {
  const q = normalize(query.trim());
  const source = q ? platformStops.filter((s) => normalize(s.name).includes(q)) : platformStops;

  const groupsByKey = new Map<string, Stop[]>();
  for (const s of source) {
    const key = s.parentStation ? `parent:${s.parentStation}` : `name:${s.name.toLowerCase()}`;
    const existing = groupsByKey.get(key);
    if (existing) existing.push(s);
    else groupsByKey.set(key, [s]);
  }

  const groups: ParentStopGroup[] = [];
  for (const [key, terminalsRaw] of groupsByKey) {
    const terminals = key.startsWith('parent:')
      ? terminalsRaw
      : (() => {
          const seen = new Set<string>();
          return terminalsRaw.filter((s) => {
            const directionKey =
              s.bearing !== undefined ? bearingToCompassKey(s.bearing) : s.code || s.id;
            if (seen.has(directionKey)) return false;
            seen.add(directionKey);
            return true;
          });
        })();
    const sorted = terminals.slice().sort((a, b) => (a.code || '').localeCompare(b.code || ''));
    groups.push({ key, representative: sorted[0] || terminalsRaw[0], terminals: sorted });
  }

  groups.sort((a, b) => a.representative.name.localeCompare(b.representative.name));
  const limit = 20;
  return { groups: groups.slice(0, limit), hasMore: groups.length > limit };
}

/**
 * Merges recent routes and stops into a single time-sorted list (newest first, max 12),
 * resolves IDs to full objects, and filters to the items relevant to the current tab.
 */
export function mergeAndFilterRecents(
  recentRoutes: RecentItem[],
  recentStops: RecentItem[],
  routesById: Map<string, Route>,
  stopsById: Map<string, Stop>,
  filter: FilterType
): RecentMergedItem[] {
  const withType = [
    ...recentRoutes.map((r) => ({ ...r, type: 'route' as const })),
    ...recentStops.map((s) => ({ ...s, type: 'stop' as const })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 12);

  const resolved = withType
    .map((item) => {
      if (item.type === 'route') {
        const route = routesById.get(item.id);
        return route ? ({ data: route, type: 'route' as const } satisfies RecentRouteItem) : null;
      }
      const stop = stopsById.get(item.id);
      return stop ? ({ data: stop, type: 'stop' as const } satisfies RecentStopItem) : null;
    })
    .filter((x): x is RecentMergedItem => x !== null);

  if (filter === 'stanice') {
    return resolved.filter((x) => x.type === 'stop');
  }
  if (filter === 'tram' || filter === 'bus' || filter === 'trains') {
    const routeTypeMatch =
      filter === 'tram' ? isRouteTypeTram : filter === 'bus' ? isRouteTypeBus : isRouteTypeRail;
    return resolved.filter((x) => x.type === 'route' && routeTypeMatch(x.data.type));
  }
  return resolved;
}

/** Lowercase + strip diacritics so "crnomerec" matches "Črnomerec". */
function normalize(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
