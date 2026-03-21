import { useState, useEffect, useRef } from 'react';
import { GTFS_PROXY_URL } from '../config';

export interface RoadClosure {
    id: string; // Internal or CKAN _id
    direction: string; // e.g. "BOTH_DIRECTIONS"
    startDate: string; // ISO 8601 or POSIX
    endDate: string; // ISO 8601 or POSIX
    // An array of coordinates (latitude, longitude)
    polyline: [number, number][];
    streetName: string; // E.g. Kamenarka
    reason: string; // E.g. "ROAD_CLOSED_CONSTRUCTION"
}

interface CacheData {
    timestamp: number;
    closures: RoadClosure[];
}

/** Bumped when payload shape changes (drops bad legacy CKAN-normalized cache). */
const CACHE_KEY = 'kreni-road-closures-cache-v2';

function pickIsoDateString(value: unknown): string {
    if (typeof value !== 'string') return '';
    const s = value.trim();
    if (!s) return '';
    const t = Date.parse(s);
    return Number.isNaN(t) ? '' : s;
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

/** Map Zagreb open-data JSON or worker output into a single `RoadClosure` shape. */
function normalizeRoadClosure(raw: unknown, index: number): RoadClosure | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;

    const streetName =
        (typeof r.streetName === 'string' && r.streetName.trim()) ||
        (typeof r.street === 'string' && r.street.trim()) ||
        '';

    const startDate = pickIsoDateString(r.startDate) || pickIsoDateString(r.expectedStartTime);
    const endDate = pickIsoDateString(r.endDate) || pickIsoDateString(r.expectedEndTime);

    const direction = typeof r.direction === 'string' && r.direction ? r.direction : 'BOTH_DIRECTIONS';

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
        id,
        direction,
        startDate,
        endDate,
        polyline,
        streetName,
        reason,
    };
}

function normalizeClosuresList(raw: unknown): RoadClosure[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item, i) => normalizeRoadClosure(item, i))
        .filter((c): c is RoadClosure => c !== null);
}

/** Client cache TTL; matches poll interval and worker `max-age` for closures. */
export const ROAD_CLOSURES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function useRoadClosures(enabled: boolean) {
    const [closures, setClosures] = useState<RoadClosure[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastFetched, setLastFetched] = useState<number>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) return (JSON.parse(cached) as CacheData).timestamp;
        } catch {
            /* ignore */
        }
        return 0;
    });

    // Ref to hold the latest interval ID
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        let isMounted = true;

        const fetchData = async () => {
            try {
                // Check cache first
                const cacheStr = localStorage.getItem(CACHE_KEY);
                if (cacheStr) {
                    try {
                        const cache: CacheData = JSON.parse(cacheStr);
                        if (Date.now() - cache.timestamp < ROAD_CLOSURES_CACHE_TTL_MS) {
                            if (isMounted) {
                                setClosures(normalizeClosuresList(cache.closures));
                                setLastFetched(cache.timestamp);
                            }
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse road closures cache', e);
                    }
                }

                if (isMounted) setLoading(true);

                const response = await fetch(`${GTFS_PROXY_URL}/?endpoint=road-closures`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch road closures: ${response.status}`);
                }

                const data = await response.json();
                const newClosures = normalizeClosuresList(data.closures);
                const fetchedAt = Date.now();

                if (isMounted) {
                    setClosures(newClosures);
                    setLastFetched(fetchedAt);
                    setLoading(false);
                    setError(null);
                }

                // Update cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: fetchedAt,
                    closures: newClosures
                }));

            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error fetching road closures'));
                    setLoading(false);
                }
            }
        };

        // Fetch immediately
        fetchData();

        // Set up polling interval
        intervalRef.current = window.setInterval(fetchData, ROAD_CLOSURES_CACHE_TTL_MS);

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled]);

    return { closures, loading, error, lastFetched };
}
