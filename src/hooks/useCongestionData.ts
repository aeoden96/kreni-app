/**
 * Computes live tram congestion data from the realtime store's tripUpdates.
 *
 * For each tram stop, aggregates arrivalDelay/departureDelay across all
 * active trip-updates and produces a heat-point: { lat, lon, avgDelay, ... }.
 *
 * Also fetches historical congestion baselines from the CF Worker so the UI
 * can display "X% more/less congested than usual".
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRealtimeStore } from '../stores/realtimeStore';
import type { Stop, Route } from '../utils/gtfs';
import { GTFS_PROXY_URL, GTFS_API_KEY } from '../config';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CongestionPoint {
    stopId: string;
    stopName: string;
    lat: number;
    lon: number;
    /** Average delay in seconds (positive = late) */
    avgDelay: number;
    /** Maximum delay observed at this stop */
    maxDelay: number;
    /** Number of trip-updates contributing to this stop */
    tripCount: number;
    /** Classified congestion level */
    level: 'low' | 'medium' | 'high' | 'severe';
    /** Historical average delay for this day-of-week + hour, if available */
    historicalAvgDelay?: number;
    /** Ratio: liveDelay / historicalDelay.  >1 = worse than usual */
    vsHistorical?: number;
}

interface HistoricalData {
    /** data[dayOfWeek][hour][stopId] = [sumOfDelays, sampleCount] */
    data: Record<string, Record<string, Record<string, [number, number]>>>;
    lastUpdated?: string;
    totalSamples?: number;
}

// ── Classification ─────────────────────────────────────────────────────────

function classifyDelay(avgDelay: number): CongestionPoint['level'] {
    const abs = Math.abs(avgDelay);
    if (abs < 60) return 'low';        // < 1 min
    if (abs < 180) return 'medium';    // 1-3 min
    if (abs < 360) return 'high';      // 3-6 min
    return 'severe';                    // > 6 min
}

// ── Tram route detection ───────────────────────────────────────────────────

/** Route type 0 = tram in GTFS / ZET data. */
const TRAM_ROUTE_TYPE = 0;

// ── Hook ───────────────────────────────────────────────────────────────────

interface UseCongestionDataOptions {
    /** If false, skip computation entirely. */
    enabled: boolean;
    /** All stops with coordinates, from useInitialData. */
    stopsById: Map<string, Stop>;
    /** Route lookup to filter tram routes only. */
    routesById: Map<string, Route>;
}

export function useCongestionData({ enabled, stopsById, routesById }: UseCongestionDataOptions) {
    const tripUpdates = useRealtimeStore((s) => s.tripUpdates);
    const lastUpdate = useRealtimeStore((s) => s.lastUpdate);

    // ── Historical data ──────────────────────────────────────────────────────

    const [historical, setHistorical] = useState<HistoricalData | null>(null);
    const [historicalError, setHistoricalError] = useState<string | null>(null);

    const fetchHistorical = useCallback(async () => {
        if (!GTFS_PROXY_URL) return;
        try {
            const url = `${GTFS_PROXY_URL}/?endpoint=congestion-history`;
            const headers: Record<string, string> = {};
            if (GTFS_API_KEY) headers['X-API-Key'] = GTFS_API_KEY;
            const res = await fetch(url, { headers });
            if (!res.ok) {
                // 404 = no data yet, not an error worth surfacing
                if (res.status === 404) return;
                throw new Error(`HTTP ${res.status}`);
            }
            const data: HistoricalData = await res.json();
            setHistorical(data);
            setHistoricalError(null);
        } catch (err) {
            console.warn('[Congestion] Failed to fetch historical data:', err);
            setHistoricalError(err instanceof Error ? err.message : 'unknown');
        }
    }, []);

    // Fetch historical data once on mount, then every 10 minutes
    useEffect(() => {
        if (!enabled) return;
        fetchHistorical();
        const interval = setInterval(fetchHistorical, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [enabled, fetchHistorical]);

    // ── Tram route IDs (memoised) ────────────────────────────────────────────

    const tramRouteIds = useMemo(() => {
        const ids = new Set<string>();
        for (const [id, route] of routesById) {
            if (route.type === TRAM_ROUTE_TYPE) ids.add(id);
        }
        return ids;
    }, [routesById]);

    // ── Live congestion computation ──────────────────────────────────────────

    const congestionPoints: CongestionPoint[] = useMemo(() => {
        if (!enabled || tramRouteIds.size === 0 || tripUpdates.size === 0) return [];

        // Accumulate per-node delays
        // A node is a parent station (if it exists) or the platform itself.
        const nodeDelays = new Map<string, { delay: number; platformId: string }[]>();
        const nodeStops = new Map<string, Stop>();

        for (const [, update] of tripUpdates) {
            if (!tramRouteIds.has(update.routeId)) continue;
            for (const stu of update.stopTimeUpdates) {
                const delay = stu.arrivalDelay ?? stu.departureDelay;
                if (delay === undefined) continue;

                const stop = stopsById.get(stu.stopId);
                if (!stop) continue;

                // Group by parentStation if available
                const nodeId = stop.parentStation || stop.id;
                const parentStop = stopsById.get(nodeId) || stop;

                const arr = nodeDelays.get(nodeId);
                if (arr) arr.push({ delay, platformId: stop.id });
                else {
                    nodeDelays.set(nodeId, [{ delay, platformId: stop.id }]);
                    nodeStops.set(nodeId, parentStop);
                }
            }
        }

        // Determine current historical bucket in Zagreb time context
        const now = new Date();
        const zagrebTimeStr = now.toLocaleString('en-US', { timeZone: 'Europe/Zagreb' });
        const zagrebDate = new Date(zagrebTimeStr);
        const dayKey = zagrebDate.getDay().toString();
        const hourKey = zagrebDate.getHours().toString();
        const histBucket = historical?.data?.[dayKey]?.[hourKey];

        // Convert to CongestionPoints Grouped
        const points: CongestionPoint[] = [];
        for (const [nodeId, items] of nodeDelays) {
            const stop = nodeStops.get(nodeId);
            if (!stop) continue;

            const sum = items.reduce((a, b) => a + b.delay, 0);
            const avg = sum / items.length;
            const max = Math.max(...items.map((i) => i.delay));

            const point: CongestionPoint = {
                stopId: nodeId,
                stopName: stop.name,
                lat: stop.lat,
                lon: stop.lon,
                avgDelay: Math.round(avg),
                maxDelay: max,
                tripCount: items.length,
                level: classifyDelay(avg),
            };

            // Calculate historical comparison by summing all unique children platform histories
            if (histBucket) {
                let totalHistSum = 0;
                let totalHistN = 0;

                // Deduplicate platform IDs so we only check the historical bucket once per platform
                const uniquePlatformIds = Array.from(new Set(items.map((i) => i.platformId)));
                for (const pid of uniquePlatformIds) {
                    const h = histBucket[pid];
                    if (h) {
                        totalHistSum += h[0];
                        totalHistN += h[1];
                    }
                }

                if (totalHistN > 0) {
                    const histAvg = totalHistSum / totalHistN;
                    point.historicalAvgDelay = Math.round(histAvg);
                    point.vsHistorical = histAvg > 0 ? avg / histAvg : undefined;
                }
            }

            points.push(point);
        }

        return points;
    }, [enabled, tripUpdates, tramRouteIds, stopsById, historical]);

    // ── Summary stats ────────────────────────────────────────────────────────

    const summary = useMemo(() => {
        if (congestionPoints.length === 0) return null;
        const delays = congestionPoints.map((p) => p.avgDelay);
        const avg = delays.reduce((a, b) => a + b, 0) / delays.length;
        const severe = congestionPoints.filter((p) => p.level === 'severe').length;
        const high = congestionPoints.filter((p) => p.level === 'high').length;
        return {
            averageDelay: Math.round(avg),
            stopsWithData: congestionPoints.length,
            severeCount: severe,
            highCount: high,
        };
    }, [congestionPoints]);

    return {
        congestionPoints,
        summary,
        historical,
        historicalError,
        lastUpdate,
        tramRouteCount: tramRouteIds.size,
    };
}
