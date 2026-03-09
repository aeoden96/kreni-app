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
    crossStreet: string; // E.g. Slavonska avenija
    reason: string; // E.g. "ROAD_CLOSED_CONSTRUCTION"
}

interface CacheData {
    timestamp: number;
    closures: RoadClosure[];
}

const CACHE_KEY = 'kreni-road-closures-cache';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export function useRoadClosures(enabled: boolean) {
    const [closures, setClosures] = useState<RoadClosure[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

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
                        if (Date.now() - cache.timestamp < CACHE_DURATION_MS) {
                            if (isMounted) {
                                setClosures(cache.closures);
                                // Don't set loading if we have valid cache
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
                const newClosures: RoadClosure[] = data.closures || [];

                if (isMounted) {
                    setClosures(newClosures);
                    setLoading(false);
                    setError(null);
                }

                // Update cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
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
        intervalRef.current = window.setInterval(fetchData, CACHE_DURATION_MS);

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled]);

    return { closures, loading, error };
}
