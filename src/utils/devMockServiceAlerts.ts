/**
 * Dev-only mock ZET service alerts for previewing the Disruptions chip/modal
 * without waiting for live RSS/GTFS-RT alerts. Returns [] unless
 * MOCK_SERVICE_ALERTS is enabled (VITE_MOCK_ALERTS=true, dev builds only).
 */

import type { Route, Stop } from './gtfs';
import type { ParsedServiceAlert } from './realtime';

import { MOCK_SERVICE_ALERTS } from '../config';

const HOUR = 3600;

export function getMockServiceAlerts(
  routesById: Map<string, Route>,
  stops: Stop[] = []
): ParsedServiceAlert[] {
  if (!MOCK_SERVICE_ALERTS) return [];

  const nowSec = Math.floor(Date.now() / 1000);
  const tramRouteIds = firstRouteIdOfType(routesById, 0);
  const busRouteIds = firstRouteIdOfType(routesById, 3);
  // Real stop ids so the stop banner / marker badge / map cross-link are exercisable.
  const tramStopIds = firstStopIdsOfType(stops, 0, 3);
  const busStopIds = firstStopIdsOfType(stops, 3, 2);

  return [
    {
      activeSince: nowSec - 2 * HOUR,
      activeUntil: nowSec + 6 * HOUR,
      cause: 'CONSTRUCTION',
      description:
        'Zbog radova na kolniku tramvaji voze izmijenjenom trasom preko Trga bana Jelačića. Očekuju se manja kašnjenja.',
      effect: 'DETOUR',
      header: '[MOCK] Preusmjerenje tramvaja u centru',
      id: 'mock-alert-detour',
      routeIds: tramRouteIds,
      stopIds: tramStopIds,
      url: 'https://www.zet.hr/',
    },
    {
      activeSince: nowSec - 30 * 60,
      activeUntil: nowSec + 3 * HOUR,
      cause: 'ACCIDENT',
      description: 'Prometna nesreća uzrokuje veća kašnjenja autobusa na ovoj liniji.',
      effect: 'SIGNIFICANT_DELAYS',
      header: '[MOCK] Veća kašnjenja autobusa',
      id: 'mock-alert-delays',
      routeIds: busRouteIds,
      stopIds: busStopIds,
      url: 'https://www.zet.hr/',
    },
  ];
}

/** Pick the first route id matching one of the GTFS route types (0 tram, 3 bus). */
function firstRouteIdOfType(routesById: Map<string, Route>, type: number): string[] {
  for (const [id, route] of routesById) {
    if (route.type === type) return [id];
  }
  return [];
}

/** Pick up to `n` platform stop ids matching a GTFS route type (0 tram, 3 bus). */
function firstStopIdsOfType(stops: Stop[], type: number, n: number): string[] {
  const ids: string[] = [];
  for (const stop of stops) {
    if (stop.locationType === 0 && stop.routeType === type) {
      ids.push(stop.id);
      if (ids.length >= n) break;
    }
  }
  return ids;
}
