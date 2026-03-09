import { useState, useEffect } from 'react';
import { GTFS_PROXY_URL, GTFS_API_KEY } from '../config';
import type { ParsedServiceAlert } from '../utils/realtime';
import type { Route } from '../utils/gtfs';

interface RssAlert {
  id: string;
  guid: string;
  title: string;
  lines: string[];
  type: 'route-change' | 'stop-change' | 'cancellation' | 'new-service' | 'other';
  startDate: string | null;
  endDate: string | null;
  affectedStops: string[];
  summary: string;
  pubDate: string;
  url: string;
  processedAt: string;
}

interface RssAlertsFile {
  alerts: RssAlert[];
  lastUpdate: string;
}

const TYPE_TO_EFFECT: Record<RssAlert['type'], string> = {
  'route-change': 'DETOUR',
  'stop-change': 'STOP_MOVED',
  'cancellation': 'NO_SERVICE',
  'new-service': 'ADDITIONAL_SERVICE',
  'other': 'OTHER_EFFECT',
};

const CACHE_KEY = 'kreni-rss-alerts-cache';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes – alerts update every 4 h

function toActivePosix(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ts = Date.parse(dateStr);
  return isNaN(ts) ? null : Math.floor(ts / 1000);
}

function convertToServiceAlerts(
  rssAlerts: RssAlert[],
  routesById: Map<string, Route>,
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
      id: `rss-${a.id}`,
      routeIds: a.lines
        .map((line) => shortNameIndex.get(line))
        .filter((id): id is string => id !== undefined),
      stopIds: [],
      header: a.title,
      description: a.summary,
      cause: 'OTHER_CAUSE',
      effect: TYPE_TO_EFFECT[a.type] ?? 'OTHER_EFFECT',
      activeSince: toActivePosix(a.startDate),
      activeUntil: toActivePosix(a.endDate),
      url: a.url,
    }));
}

export function useRssServiceAlerts(routesById: Map<string, Route>): ParsedServiceAlert[] {
  const [alerts, setAlerts] = useState<ParsedServiceAlert[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Try localStorage cache
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { ts, data }: { ts: number; data: RssAlert[] } = JSON.parse(cached);
          if (Date.now() - ts < CACHE_DURATION_MS) {
            if (!cancelled) {
              setAlerts(convertToServiceAlerts(data, routesById));
            }
            return;
          }
        }
      } catch {
        // ignore corrupt cache
      }

      try {
        const url = GTFS_PROXY_URL
          ? `${GTFS_PROXY_URL}?endpoint=service-alerts`
          : `${import.meta.env.BASE_URL}data/service-alerts.json`;
        const headers: Record<string, string> = {};
        if (GTFS_PROXY_URL && GTFS_API_KEY) headers['X-API-Key'] = GTFS_API_KEY;
        const res = await fetch(url, GTFS_PROXY_URL ? { headers } : undefined);
        if (!res.ok) return;
        const json: RssAlertsFile = await res.json();

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: json.alerts }));
        } catch {
          // storage quota exceeded – ignore
        }

        if (!cancelled) {
          setAlerts(convertToServiceAlerts(json.alerts, routesById));
        }
      } catch {
        // network error – silently ignore, RSS alerts are non-critical
      }
    }

    load();
    return () => { cancelled = true; };
  // routesById is a new Map reference on every render but its content is stable
  // after initial data load. Using .size as a proxy dep avoids infinite re-runs
  // while still re-fetching once routes are available.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesById.size]);

  return alerts;
}
