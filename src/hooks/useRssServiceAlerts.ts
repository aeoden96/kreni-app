import { useEffect, useMemo, useState } from 'react';

import type { Route, Stop } from '../utils/gtfs';
import type { ParsedServiceAlert } from '../utils/realtime';
import type { StopNameIndex } from '../utils/stopNameMatch';

import { GTFS_API_KEY, GTFS_PROXY_URL } from '../config';
import { buildStopNameIndex, matchStopName } from '../utils/stopNameMatch';

interface RssAlert {
  affectedStops: string[];
  endDate: null | string;
  guid: string;
  id: string;
  lines: string[];
  processedAt: string;
  pubDate: string;
  startDate: null | string;
  summary: string;
  title: string;
  type: 'cancellation' | 'new-service' | 'other' | 'route-change' | 'stop-change';
  url: string;
}

interface RssAlertsFile {
  alerts: RssAlert[];
  lastUpdate: string;
}

const TYPE_TO_EFFECT: Record<RssAlert['type'], string> = {
  cancellation: 'NO_SERVICE',
  'new-service': 'ADDITIONAL_SERVICE',
  other: 'OTHER_EFFECT',
  'route-change': 'DETOUR',
  'stop-change': 'STOP_MOVED',
};

const CACHE_KEY = 'kreni-rss-alerts-cache';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes – alerts update every 4 h

export function useRssServiceAlerts(
  routesById: Map<string, Route>,
  stops: Stop[]
): ParsedServiceAlert[] {
  const [alerts, setAlerts] = useState<ParsedServiceAlert[]>([]);

  // Stop-name → id index for matching alerts' `affectedStops`. Stable after the
  // initial data load; rebuilt only when the stop list itself changes.
  const stopIndex = useMemo(() => buildStopNameIndex(stops), [stops]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try localStorage cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, ts }: { data: RssAlert[]; ts: number } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_DURATION_MS) {
            if (!cancelled) {
              setAlerts(convertToServiceAlerts(data, routesById, stopIndex));
            }
            return;
          }
        }
      } catch {
        // ignore corrupt cache
      }

      try {
        if (!GTFS_PROXY_URL) return;

        const headers: Record<string, string> = {};
        if (GTFS_API_KEY) headers['X-API-Key'] = GTFS_API_KEY;
        const res = await fetch(`${GTFS_PROXY_URL}?endpoint=service-alerts`, { headers });
        if (!res.ok) return;
        const json: RssAlertsFile = await res.json();

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json.alerts, ts: Date.now() }));
        } catch {
          // storage quota exceeded – ignore
        }

        if (!cancelled) {
          setAlerts(convertToServiceAlerts(json.alerts, routesById, stopIndex));
        }
      } catch {
        // network error – silently ignore, RSS alerts are non-critical
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // routesById is a new Map reference on every render but its content is stable
    // after initial data load. Using .size as a proxy dep avoids infinite re-runs
    // while still re-fetching once routes are available. stopIndex is memoized on
    // the stop list, so it too is stable after load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesById.size, stopIndex]);

  return alerts;
}

function convertToServiceAlerts(
  rssAlerts: RssAlert[],
  routesById: Map<string, Route>,
  stopIndex: StopNameIndex
): ParsedServiceAlert[] {
  // Build a short-name → routeId index once
  const shortNameIndex = new Map<string, string>();
  for (const [id, route] of routesById) {
    shortNameIndex.set(route.shortName, id);
  }

  // Filter to only currently active or future alerts
  const now = Date.now() / 1000;

  return rssAlerts
    .filter((a) => {
      const until = toActivePosix(a.endDate);
      // Keep if no end date known, or end date is in the future
      return until === null || until > now;
    })
    .map((a): ParsedServiceAlert => ({
      activeSince: toActivePosix(a.startDate),
      activeUntil: toActivePosix(a.endDate),
      cause: 'OTHER_CAUSE',
      description: a.summary,
      effect: TYPE_TO_EFFECT[a.type] ?? 'OTHER_EFFECT',
      header: a.title,
      id: `rss-${a.id}`,
      routeIds: a.lines
        .map((line) => shortNameIndex.get(line))
        .filter((id): id is string => id !== undefined),
      stopIds: [...new Set(a.affectedStops.flatMap((name) => matchStopName(name, stopIndex)))],
      url: a.url,
    }));
}

function toActivePosix(dateStr: null | string): null | number {
  if (!dateStr) return null;
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? null : Math.floor(ts / 1000);
}
