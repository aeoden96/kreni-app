import { useCallback, useEffect, useRef, useState } from 'react';

import { GTFS_API_KEY, GTFS_PROXY_URL } from '../config';

export interface RoadClosure {
  direction: string; // e.g. "BOTH_DIRECTIONS"
  endDate: string; // ISO 8601 or POSIX
  id: string; // Internal or CKAN _id
  // An array of coordinates (latitude, longitude)
  polyline: [number, number][];
  reason: string; // E.g. "ROAD_CLOSED_CONSTRUCTION"
  startDate: string; // ISO 8601 or POSIX
  streetName: string; // E.g. Kamenarka
}

interface CacheData {
  closures: RoadClosure[];
  timestamp: number;
}

/** Bumped when payload shape changes (drops bad legacy CKAN-normalized cache). */
const CACHE_KEY = 'kreni-road-closures-cache-v2';

function normalizeClosuresList(raw: unknown): RoadClosure[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeRoadClosure(item, i))
    .filter((c): c is RoadClosure => c !== null);
}

/** Map Zagreb open-data JSON or worker output into a single `RoadClosure` shape. */
function normalizeRoadClosure(raw: unknown, index: number): null | RoadClosure {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const streetName =
    (typeof r.streetName === 'string' && r.streetName.trim()) ||
    (typeof r.street === 'string' && r.street.trim()) ||
    '';

  const startDate = pickIsoDateString(r.startDate) || pickIsoDateString(r.expectedStartTime);
  const endDate = pickIsoDateString(r.endDate) || pickIsoDateString(r.expectedEndTime);

  const direction =
    typeof r.direction === 'string' && r.direction ? r.direction : 'BOTH_DIRECTIONS';

  const reason =
    (typeof r.subtype === 'string' && r.subtype) ||
    (typeof r.reason === 'string' && r.reason) ||
    (typeof r.type === 'string' && r.type) ||
    'ROAD_CLOSED';

  const polyline = parsePolylineCoords(r.polyline);
  if (polyline.length === 0) return null;

  const id =
    typeof r.id === 'string' && r.id
      ? r.id
      : `${index}-${streetName || 'closure'}-${startDate || endDate || '0'}`;

  return {
    direction,
    endDate,
    id,
    polyline,
    reason,
    startDate,
    streetName,
  };
}

function parsePolylineCoords(value: unknown): [number, number][] {
  if (typeof value === 'string') {
    const parts = value.trim().split(/\s+/);
    const out: [number, number][] = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const lat = parseFloat(parts[i]);
        const lon = parseFloat(parts[i + 1]);
        if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
          out.push([lat, lon]);
        }
      }
    }
    return out;
  }
  if (!Array.isArray(value)) return [];
  const out: [number, number][] = [];
  for (const p of value) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lat = Number(p[0]);
    const lon = Number(p[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      out.push([lat, lon]);
    }
  }
  return out;
}

function pickIsoDateString(value: unknown): string {
  if (typeof value !== 'string') return '';
  const s = value.trim();
  if (!s) return '';
  const t = Date.parse(s);
  return Number.isNaN(t) ? '' : s;
}

/** Client cache TTL; matches poll interval and worker `max-age` for closures. */
export const ROAD_CLOSURES_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/** Minimum gap between manual “refresh” taps (avoids hammering the proxy). */
const ROAD_CLOSURES_MANUAL_REFRESH_COOLDOWN_MS = 45 * 1000;

export function useRoadClosures(enabled: boolean) {
  const [closures, setClosures] = useState<RoadClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  /** When the current list was last loaded from network or fresh localStorage (ms since epoch). */
  const [refreshedAtMs, setRefreshedAtMs] = useState<null | number>(null);

  const intervalRef = useRef<null | number>(null);
  const isMountedRef = useRef(true);
  const manualCooldownEndsRef = useRef(0);
  const [manualCooldownEndsAt, setManualCooldownEndsAt] = useState(0);
  const [manualCooldownTick, setManualCooldownTick] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      manualCooldownEndsRef.current = 0;
      setManualCooldownEndsAt(0);
    }
  }, [enabled]);

  useEffect(() => {
    if (manualCooldownEndsAt === 0) {
      return;
    }
    const deadline = manualCooldownEndsAt;
    const id = window.setInterval(() => {
      const now = Date.now();
      if (now >= deadline) {
        manualCooldownEndsRef.current = 0;
        setManualCooldownEndsAt(0);
        clearInterval(id);
      }
      setManualCooldownTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [manualCooldownEndsAt]);

  const fetchData = useCallback(async (bypassCache: boolean) => {
    try {
      if (!bypassCache) {
        const cacheStr = localStorage.getItem(CACHE_KEY);
        if (cacheStr) {
          try {
            const cache: CacheData = JSON.parse(cacheStr);
            if (Date.now() - cache.timestamp < ROAD_CLOSURES_CACHE_DURATION_MS) {
              if (isMountedRef.current) {
                setClosures(normalizeClosuresList(cache.closures));
                setRefreshedAtMs(cache.timestamp);
              }
              return;
            }
          } catch (e) {
            console.error('Failed to parse road closures cache', e);
          }
        }
      }

      if (isMountedRef.current) {
        setLoading(true);
      }

      const headers: Record<string, string> = {};
      if (GTFS_API_KEY) {
        headers['X-API-Key'] = GTFS_API_KEY;
      }

      const response = await fetch(`${GTFS_PROXY_URL}/?endpoint=road-closures`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch road closures: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.closures)) {
        console.error('Invalid road closures data format:', data);
        throw new Error('Invalid road closures data format');
      }

      const newClosures = normalizeClosuresList(data.closures);
      const fetchedAt = Date.now();

      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          closures: newClosures,
          timestamp: fetchedAt,
        } satisfies CacheData)
      );

      if (isMountedRef.current) {
        setClosures(newClosures);
        setError(null);
        setLoading(false);
        setRefreshedAtMs(fetchedAt);
      }
    } catch (err) {
      console.error('Error fetching road closures:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error fetching road closures'));
        setLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(() => {
    const now = Date.now();
    if (now < manualCooldownEndsRef.current) {
      return;
    }
    const ends = now + ROAD_CLOSURES_MANUAL_REFRESH_COOLDOWN_MS;
    manualCooldownEndsRef.current = ends;
    setManualCooldownEndsAt(ends);
    void fetchData(true);
  }, [fetchData]);

  void manualCooldownTick;
  const manualRefreshLocked = loading || Date.now() < manualCooldownEndsAt;
  const manualRefreshSecondsLeft =
    manualCooldownEndsAt > Date.now()
      ? Math.max(1, Math.ceil((manualCooldownEndsAt - Date.now()) / 1000))
      : null;

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    void fetchData(false);

    intervalRef.current = window.setInterval(() => {
      void fetchData(false);
    }, ROAD_CLOSURES_CACHE_DURATION_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, fetchData]);

  return {
    closures,
    error,
    loading,
    manualRefreshLocked,
    manualRefreshSecondsLeft,
    refetch,
    refreshedAtMs,
  };
}
