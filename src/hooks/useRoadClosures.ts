import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { queryKeys } from '../api/queryKeys';
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
  const {
    data,
    dataUpdatedAt,
    error,
    isFetching,
    refetch: queryRefetch,
  } = useQuery({
    enabled,
    queryFn: fetchRoadClosuresFromNetwork,
    queryKey: queryKeys.roadClosures.all,
    refetchInterval: ROAD_CLOSURES_CACHE_DURATION_MS,
    refetchOnWindowFocus: false,
    staleTime: ROAD_CLOSURES_MANUAL_REFRESH_COOLDOWN_MS,
  });

  const closures = data ?? [];
  const loading = isFetching;
  const refreshedAtMs = dataUpdatedAt;

  const [now, setNow] = useState(() => Date.now());

  // We keep a minor interval purely to update the UI countdown visually
  useEffect(() => {
    if (!dataUpdatedAt) return;

    const cooldownEndsAt = dataUpdatedAt + ROAD_CLOSURES_MANUAL_REFRESH_COOLDOWN_MS;

    if (Date.now() >= cooldownEndsAt) return; // No need to tick if already expired

    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= cooldownEndsAt) {
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const cooldownEndsAt = dataUpdatedAt
    ? dataUpdatedAt + ROAD_CLOSURES_MANUAL_REFRESH_COOLDOWN_MS
    : 0;
  const manualRefreshLocked = loading || now < cooldownEndsAt;
  const manualRefreshSecondsLeft =
    cooldownEndsAt > now ? Math.max(1, Math.ceil((cooldownEndsAt - now) / 1000)) : null;

  const refetch = useCallback(() => {
    const now = Date.now();
    if (now < cooldownEndsAt || isFetching) {
      return;
    }
    void queryRefetch();
  }, [cooldownEndsAt, isFetching, queryRefetch]);

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

async function fetchRoadClosuresFromNetwork(): Promise<RoadClosure[]> {
  const headers: Record<string, string> = {};
  if (GTFS_API_KEY) {
    headers['X-API-Key'] = GTFS_API_KEY;
  }

  const response = await fetch(`${GTFS_PROXY_URL}/?endpoint=road-closures`, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch road closures: ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.closures)) {
    console.error('Invalid road closures data format:', payload);
    throw new Error('Invalid road closures data format');
  }

  return normalizeClosuresList(payload.closures);
}
