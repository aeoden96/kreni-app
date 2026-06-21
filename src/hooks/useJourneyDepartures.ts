/**
 * Builds a chronological A→B departures board for train mode.
 *
 * Given an origin/destination stop and the set of routes that connect them
 * (from useDirections), it fetches each route's timetable, filters to today's
 * day-type bucket, and returns every direct run with departure/arrival times
 * and duration — the core "when does a train leave for B" rail question.
 *
 * Only direct trains are considered (no multi-leg routing).
 */

import { useEffect, useMemo, useState } from 'react';

import type { Route, RouteTimetable } from '../utils/gtfs';

import { fetchRouteTimetable } from '../utils/gtfs';
import { useInitialData } from './useInitialData';

export interface JourneyDeparture {
  /** Scheduled arrival at the destination (minutes from midnight). */
  arrMin: number;
  /** Scheduled departure from the origin (minutes from midnight). */
  depMin: number;
  /** Travel time in minutes. */
  durationMin: number;
  /** Bucket-prefixed trip instance id. */
  instanceId: string;
  route: Route;
  /** Train number parsed from the instance id, when available. */
  trainNumber: string;
}

export function useJourneyDepartures(
  fromStopId: null | string,
  toStopId: null | string,
  routeIds: string[],
  routesById: Map<string, Route>,
  dataDir: string
): { departures: JourneyDeparture[]; loading: boolean } {
  const { calendar } = useInitialData({ dataDir });
  const [timetables, setTimetables] = useState<Map<string, RouteTimetable>>(new Map());
  const [loading, setLoading] = useState(false);

  // Stable dependency key so the effect only refetches when the set changes.
  const routeKey = useMemo(() => [...routeIds].sort().join(','), [routeIds]);

  useEffect(() => {
    if (!fromStopId || !toStopId || routeIds.length === 0) {
      setTimetables(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);

    Promise.all(
      routeIds.map((rid) =>
        fetchRouteTimetable(rid, dataDir)
          .then((tt) => [rid, tt] as const)
          .catch(() => null)
      )
    ).then((entries) => {
      if (cancelled) return;
      setTimetables(new Map(entries.filter((e): e is [string, RouteTimetable] => e !== null)));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // routeKey is the stable serialization of routeIds; depending on the array
    // itself would refetch on every identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, fromStopId, toStopId, dataDir]);

  const departures = useMemo<JourneyDeparture[]>(() => {
    if (!fromStopId || !toStopId) return [];

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const serviceId = calendar[todayStr] ?? null;

    const out: JourneyDeparture[] = [];
    for (const [rid, tt] of timetables) {
      const route = routesById.get(rid);
      if (!route) continue;

      for (const [instanceId, stops] of Object.entries(tt)) {
        if (serviceId && !instanceId.startsWith(`${serviceId}_`)) continue;

        let depMin: number | undefined;
        let arrMin: number | undefined;
        let depSeq = Infinity;
        let arrSeq = -Infinity;
        for (const [sid, seq, tmin] of stops) {
          if (sid === fromStopId) {
            depMin = tmin;
            depSeq = seq;
          }
          if (sid === toStopId) {
            arrMin = tmin;
            arrSeq = seq;
          }
        }
        // Both stops present and origin precedes destination on this run.
        if (depMin === undefined || arrMin === undefined || arrSeq <= depSeq) continue;

        // instanceId = `{bucket}_{routeId}_{trainNumber}_{direction}`.
        const body = instanceId.slice(0, instanceId.lastIndexOf('_'));
        const prefix = serviceId ? `${serviceId}_${rid}_` : '';
        const trainNumber = prefix && body.startsWith(prefix) ? body.slice(prefix.length) : '';

        out.push({
          arrMin,
          depMin,
          durationMin: arrMin - depMin,
          instanceId,
          route,
          trainNumber,
        });
      }
    }

    out.sort((a, b) => a.depMin - b.depMin);
    return out;
  }, [timetables, fromStopId, toStopId, routesById, calendar]);

  return { departures, loading };
}
