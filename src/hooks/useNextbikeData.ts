import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { queryKeys } from '../api/queryKeys';

export interface BajsStation {
  active_place: number;
  bike_racks: number;
  /** Nextbike `bike_types`: type id → count at dock (Zagreb hd: 196 classic, 409 child seat). */
  bike_types?: Record<string, number>;
  bikes: number;
  bikes_available_to_rent: number;
  free_racks: number;
  lat: number;
  lng: number;
  maintenance: boolean;
  name: string;
  /** Nextbike station `number` (public id), e.g. for support. */
  place_number?: number;
  uid: number;
}

export type NextbikeFetchDiffState =
  | { items: NextbikeStationDiff[]; status: 'changes' }
  | { status: 'none' }
  | { status: 'unchanged' };

export type NextbikePair = { from: number; to: number };

/** Per-station delta since the previous successful fetch (map markers use `bikes`). */
export interface NextbikeStationDiff {
  bikes: NextbikePair | null;
  free_racks: NextbikePair | null;
  name: string;
  rentable: NextbikePair | null;
  uid: number;
}

const MAX_STATION_DIFFS = 50;

type StationCounts = {
  bikes: number;
  bikes_available_to_rent: number;
  free_racks: number;
  name: string;
};

function buildSnapshot(stations: BajsStation[]): Map<number, StationCounts> {
  const m = new Map<number, StationCounts>();
  for (const s of stations) {
    m.set(s.uid, {
      bikes: s.bikes,
      bikes_available_to_rent: s.bikes_available_to_rent,
      free_racks: s.free_racks,
      name: s.name,
    });
  }
  return m;
}

function computeStationDiffs(
  prev: Map<number, StationCounts> | null,
  next: BajsStation[]
): NextbikeStationDiff[] {
  if (!prev || prev.size === 0) return [];

  const out: NextbikeStationDiff[] = [];

  for (const s of next) {
    const p = prev.get(s.uid);
    if (!p) continue;

    const bikes = p.bikes !== s.bikes ? { from: p.bikes, to: s.bikes } : null;
    const rentable =
      p.bikes_available_to_rent !== s.bikes_available_to_rent
        ? { from: p.bikes_available_to_rent, to: s.bikes_available_to_rent }
        : null;
    const racks = p.free_racks !== s.free_racks ? { from: p.free_racks, to: s.free_racks } : null;

    if (bikes || rentable || racks) {
      out.push({ bikes, free_racks: racks, name: s.name, rentable, uid: s.uid });
    }
  }

  const score = (d: NextbikeStationDiff) => {
    let t = 0;
    if (d.bikes) t += Math.abs(d.bikes.to - d.bikes.from);
    if (d.rentable) t += Math.abs(d.rentable.to - d.rentable.from);
    if (d.free_racks) t += Math.abs(d.free_racks.to - d.free_racks.from);
    return t;
  };

  out.sort((a, b) => score(b) - score(a));
  return out;
}

/** How long Nextbike data is considered fresh; also the poll interval when the hook is enabled. */
export const NEXTBIKE_CACHE_TTL_MS = 60 * 1000;

/** Minimum time between manual “refresh now” actions (anti-spam). */
const NEXTBIKE_MANUAL_REFETCH_COOLDOWN_MS = 20 * 1000;

const NEXTBIKE_API_URL =
  'https://maps.nextbike.net/maps/nextbike-live.json?city=1172&domains=hd&list_cities=0&bikes=0';

export function useNextbikeData(enabled: boolean) {
  const prevSnapshotRef = useRef<Map<number, StationCounts> | null>(null);

  const [fetchDiffState, setFetchDiffState] = useState<NextbikeFetchDiffState>({ status: 'none' });
  const [diffOverflowCount, setDiffOverflowCount] = useState(0);

  const { data, dataUpdatedAt, error, isFetching, refetch } = useQuery({
    enabled,
    queryFn: fetchNextbikeFromNetwork,
    queryKey: queryKeys.nextbike.all,
    refetchInterval: NEXTBIKE_CACHE_TTL_MS,
    staleTime: NEXTBIKE_MANUAL_REFETCH_COOLDOWN_MS,
  });

  const stations = data ?? [];
  const loading = isFetching;
  const lastFetched = dataUpdatedAt;

  // Manual cooldown logic to prevent refresh spam
  const manualCooldownUntil = useMemo(() => {
    if (!dataUpdatedAt) return 0;
    return dataUpdatedAt + NEXTBIKE_MANUAL_REFETCH_COOLDOWN_MS;
  }, [dataUpdatedAt]);

  const refetchManual = useCallback(async (): Promise<'cooldown' | 'ok'> => {
    if (!enabled) return 'cooldown';
    const now = Date.now();
    if (now < manualCooldownUntil || isFetching) return 'cooldown';
    await refetch();
    return 'ok';
  }, [enabled, manualCooldownUntil, isFetching, refetch]);

  // Compute station availability differences every time the data actually changes
  useEffect(() => {
    if (!data) return;

    const prev = prevSnapshotRef.current;
    if (prev && prev.size > 0) {
      const allDiffs = computeStationDiffs(prev, data);

      if (allDiffs.length === 0) {
        setFetchDiffState({ status: 'unchanged' });
        setDiffOverflowCount(0);
      } else {
        const items = allDiffs.slice(0, MAX_STATION_DIFFS);
        setFetchDiffState({ items, status: 'changes' });
        setDiffOverflowCount(Math.max(0, allDiffs.length - items.length));
      }
    } else {
      setFetchDiffState({ status: 'none' });
      setDiffOverflowCount(0);
    }

    prevSnapshotRef.current = buildSnapshot(data);
  }, [data]);

  return {
    diffOverflowCount,
    error,
    fetchDiffState,
    lastFetched,
    loading,
    manualCooldownUntil,
    refetchManual,
    stations,
  };
}

async function fetchNextbikeFromNetwork(): Promise<BajsStation[]> {
  // API sends Cache-Control: max-age=86400; without this, the browser disk cache
  // can serve stale JSON and polls never see live updates.
  const response = await fetch(NEXTBIKE_API_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch nextbike data: ${response.status}`);
  }

  const payload = await response.json();

  let newStations: BajsStation[] = [];
  if (payload.countries?.[0]?.cities?.[0]) {
    const places = payload.countries[0].cities[0].places || [];
    newStations = places.map((p: Record<string, unknown>) => normalizeBajsPlace(p));
  }

  return newStations;
}

function normalizeBajsPlace(raw: Record<string, unknown>): BajsStation {
  const bikeTypesRaw = raw.bike_types;
  let bike_types: Record<string, number> | undefined;
  if (bikeTypesRaw && typeof bikeTypesRaw === 'object' && !Array.isArray(bikeTypesRaw)) {
    const entries = Object.entries(bikeTypesRaw as Record<string, unknown>)
      .map(([k, v]): [string, number] | null => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) && n > 0 ? [k, n] : null;
      })
      .filter((e): e is [string, number] => e !== null);
    if (entries.length > 0) bike_types = Object.fromEntries(entries);
  }

  const placeNo =
    typeof raw.number === 'number' && Number.isFinite(raw.number)
      ? raw.number
      : typeof raw.place_number === 'number' && Number.isFinite(raw.place_number)
        ? raw.place_number
        : undefined;

  return {
    active_place: toInt(raw.active_place),
    bike_racks: toInt(raw.bike_racks),
    bike_types,
    bikes: toInt(raw.bikes),
    bikes_available_to_rent: toInt(raw.bikes_available_to_rent),
    free_racks: toInt(raw.free_racks),
    lat: toFloat(raw.lat),
    lng: toFloat(raw.lng),
    maintenance: Boolean(raw.maintenance),
    name: typeof raw.name === 'string' ? raw.name : '',
    place_number: placeNo,
    uid: toInt(raw.uid),
  };
}

function toFloat(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
