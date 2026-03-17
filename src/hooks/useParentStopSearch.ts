import { useMemo } from 'react';
import type { Stop } from '../utils/gtfs';

export function useParentStopSearch(stops: Stop[], query: string, limit = 20): Stop[] {
  return useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const parents = stops.filter((stop) => stop.locationType === 1);

    const filtered = normalized
      ? parents.filter((stop) => stop.name.toLowerCase().includes(normalized))
      : parents;

    return filtered
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }, [limit, query, stops]);
}
