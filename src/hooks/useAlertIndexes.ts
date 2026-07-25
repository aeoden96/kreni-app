/**
 * Indexes the merged service-alert list by the things the UI selects: stops and
 * routes. Kept out of GTFSMode so the page stays about wiring, not bookkeeping.
 */

import { useMemo } from 'react';

import type { Stop } from '../utils/gtfs';
import type { ParsedServiceAlert } from '../utils/realtime';

interface AlertIndexes {
  /** routeId → alerts naming that route. */
  alertsByRouteId: Map<string, ParsedServiceAlert[]>;
  /** stopId → alerts affecting it, platform ids and parent stations alike. */
  alertsByStopId: Map<string, ParsedServiceAlert[]>;
  /** Every stop id (platform + parent) carrying an alert, for the marker badge. */
  alertStopIds: Set<string>;
}

export function useAlertIndexes(
  serviceAlerts: ParsedServiceAlert[],
  stopsById: Map<string, Stop>
): AlertIndexes {
  // Alert stopIds are platform ids; also index each under its parent station so
  // a tapped parent marker resolves its alerts too.
  const alertsByStopId = useMemo(() => {
    const map = new Map<string, ParsedServiceAlert[]>();
    for (const alert of serviceAlerts) {
      for (const sid of alert.stopIds) {
        add(map, sid, alert);
        const parent = stopsById.get(sid)?.parentStation;
        if (parent) add(map, parent, alert);
      }
    }
    return map;
  }, [serviceAlerts, stopsById]);

  const alertsByRouteId = useMemo(() => {
    const map = new Map<string, ParsedServiceAlert[]>();
    for (const alert of serviceAlerts) {
      for (const rid of alert.routeIds) add(map, rid, alert);
    }
    return map;
  }, [serviceAlerts]);

  // Memoized separately so its identity stays stable while alertsByStopId is
  // rebuilt — the StopMarkers layer is memoized on this set.
  const alertStopIds = useMemo(() => new Set(alertsByStopId.keys()), [alertsByStopId]);

  return { alertsByRouteId, alertsByStopId, alertStopIds };
}

/** Append without letting an alert land in the same bucket twice. */
function add(map: Map<string, ParsedServiceAlert[]>, id: string, alert: ParsedServiceAlert): void {
  const arr = map.get(id);
  if (arr) {
    if (!arr.includes(alert)) arr.push(alert);
  } else {
    map.set(id, [alert]);
  }
}
