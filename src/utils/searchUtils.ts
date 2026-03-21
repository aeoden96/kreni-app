/**
 * Pure helper functions for the SearchModal and its sub-components.
 */

import { TrainFront, Bus } from 'lucide-react';
import type { Route, Stop } from './gtfs';
import { bearingToCompassKey, isRouteTypeTram, isRouteTypeBus, isRouteTypeRail } from './gtfs';

export type FilterType = 'tram' | 'bus' | 'trains' | 'stanice';

export type ParentStopGroup = {
  key: string;
  representative: Stop;
  terminals: Stop[];
};

export type RecentRouteItem = { type: 'route'; data: Route };
export type RecentStopItem = { type: 'stop'; data: Stop };
export type RecentMergedItem = RecentRouteItem | RecentStopItem;

/** Returns the icon component and colour for a given platform stop route type. */
export function getStopTypeIcons(routeType?: number): { Icon: typeof TrainFront; color: string } {
  if (routeType === 3) return { Icon: Bus, color: '#d97706' };
  if (routeType === 2) return { Icon: TrainFront, color: '#dc2626' };
  return { Icon: TrainFront, color: '#2563eb' };
}

/** Returns the badge background colour for a route-type filter tab. */
export function getBadgeColor(filter: FilterType): string {
  if (filter === 'tram') return '#2563eb';
  if (filter === 'trains') return '#64748b';
  return '#d97706';
}

/**
 * Filters a source route list by the current search query.
 * Returns all routes when query is empty.
 */
export function filterRoutes(sourceRoutes: Route[], query: string): Route[] {
  if (!query.trim()) return sourceRoutes;
  const q = query.toLowerCase();
  return sourceRoutes.filter(
    (route) =>
      route.shortName.toLowerCase().includes(q) || route.longName.toLowerCase().includes(q)
  );
}

/**
 * Groups platform stops (locationType === 0) by parent station or name, deduplicates by
 * compass direction, sorts, and returns the first 20 groups with a hasMore flag.
 */
export function groupPlatformStops(
  platformStops: Stop[],
  query: string
): { groups: ParentStopGroup[]; hasMore: boolean } {
  const q = query.trim().toLowerCase();
  const source = q ? platformStops.filter((s) => s.name.toLowerCase().includes(q)) : platformStops;

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
 * Filters canonical parent stops for the directions stop-picker.
 * Returns the first 20 alphabetically sorted matches with a hasMore flag.
 */
export function filterParentStops(
  parentStops: Stop[],
  query: string
): { stops: Stop[]; hasMore: boolean } {
  const q = query.trim().toLowerCase();
  const source = q ? parentStops.filter((s) => s.name.toLowerCase().includes(q)) : parentStops;
  const sorted = source.slice().sort((a, b) => a.name.localeCompare(b.name));
  const limit = 20;
  return { stops: sorted.slice(0, limit), hasMore: sorted.length > limit };
}

interface RecentItem {
  id: string;
  timestamp: number;
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
        return route ? ({ type: 'route' as const, data: route } satisfies RecentRouteItem) : null;
      }
      const stop = stopsById.get(item.id);
      return stop ? ({ type: 'stop' as const, data: stop } satisfies RecentStopItem) : null;
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
