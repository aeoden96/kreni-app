import { useState, useEffect, useRef } from 'react';

export interface BajsStation {
    uid: number;
    lat: number;
    lng: number;
    name: string;
    bikes: number;
    bike_racks: number;
    free_racks: number;
    bikes_available_to_rent: number;
    active_place: number;
    maintenance: boolean;
}

interface CacheData {
    timestamp: number;
    stations: BajsStation[];
}

const CACHE_KEY = 'kreni-nextbike-cache';

/** How long Nextbike data is considered fresh; also the poll interval when the hook is enabled. */
export const NEXTBIKE_CACHE_TTL_MS = 60 * 1000;
const API_URL = 'https://maps.nextbike.net/maps/nextbike-live.json?city=1172&domains=hd&list_cities=0&bikes=0';

/**
 * Module-level guard so concurrent effect invocations (e.g. React Strict Mode
 * double-invoke) never fire more than one real network request at a time.
 */
let networkFetchInFlight = false;

export function useNextbikeData(enabled: boolean) {
    const [stations, setStations] = useState<BajsStation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Initialise from localStorage so the timestamp survives page re-mounts
    const [lastFetched, setLastFetched] = useState<number>(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) return (JSON.parse(cached) as CacheData).timestamp;
        } catch { /* ignore */ }
        return 0;
    });

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

        /**
         * @param force – when true (scheduled interval) always fetch from the
         *   network, bypassing the localStorage freshness check. This avoids the
         *   countdown getting stuck because a timer fired a few ms early.
         */
        const fetchData = async (force = false) => {
            if (!force) {
                // On-mount path: serve from localStorage if still fresh
                try {
                    const cacheStr = localStorage.getItem(CACHE_KEY);
                    if (cacheStr) {
                        const cache: CacheData = JSON.parse(cacheStr);
                        if (Date.now() - cache.timestamp < NEXTBIKE_CACHE_TTL_MS) {
                            if (isMounted) {
                                setStations(cache.stations);
                                setLastFetched(cache.timestamp);
                            }
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse nextbike cache', e);
                }
            }

            // Prevent concurrent fetches (e.g. Strict Mode double-invoke)
            if (networkFetchInFlight) return;
            networkFetchInFlight = true;

            if (isMounted) setLoading(true);

            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch nextbike data: ${response.status}`);
                }

                const data = await response.json();

                // Extract Zagreb stations
                let newStations: BajsStation[] = [];
                if (data.countries?.[0]?.cities?.[0]) {
                    newStations = data.countries[0].cities[0].places || [];
                }

                const now = Date.now();

                localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, stations: newStations }));

                if (isMounted) {
                    setStations(newStations);
                    setLastFetched(now);
                    setLoading(false);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error fetching nextbike data'));
                    setLoading(false);
                }
            } finally {
                networkFetchInFlight = false;
            }
        };

        fetchData(false);
        // Always force a real network request on the scheduled interval so the
        // countdown never gets stuck when the timer fires a few ms early.
        intervalRef.current = window.setInterval(() => fetchData(true), NEXTBIKE_CACHE_TTL_MS);

        return () => {
            isMounted = false;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled]);

    return { stations, loading, error, lastFetched };
}
