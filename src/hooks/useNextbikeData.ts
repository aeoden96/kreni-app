import { useState, useEffect, useRef } from 'react';

interface BajsStation {
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
const CACHE_DURATION_MS = 60 * 1000; // 1 minute
const API_URL = 'https://maps.nextbike.net/maps/nextbike-live.json?city=1172&domains=hd&list_cities=0&bikes=0';

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

        const fetchData = async () => {
            try {
                // Check cache first
                const cacheStr = localStorage.getItem(CACHE_KEY);
                if (cacheStr) {
                    try {
                        const cache: CacheData = JSON.parse(cacheStr);
                        if (Date.now() - cache.timestamp < CACHE_DURATION_MS) {
                            if (isMounted) {
                                setStations(cache.stations);
                                setLastFetched(cache.timestamp);
                            }
                            return;
                        }
                    } catch (e) {
                        console.error('Failed to parse nextbike cache', e);
                    }
                }

                if (isMounted) setLoading(true);

                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Failed to fetch nextbike data: ${response.status}`);
                }

                const data = await response.json();

                // Extract Zagreb stations
                let newStations: BajsStation[] = [];
                if (data.countries && data.countries[0] && data.countries[0].cities && data.countries[0].cities[0]) {
                    newStations = data.countries[0].cities[0].places || [];
                }

                const now = Date.now();

                if (isMounted) {
                    setStations(newStations);
                    setLastFetched(now);
                    setLoading(false);
                    setError(null);
                }

                // Update cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    timestamp: now,
                    stations: newStations
                }));

            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error('Unknown error fetching nextbike data'));
                    setLoading(false);
                }
            }
        };

        fetchData();
        intervalRef.current = window.setInterval(fetchData, CACHE_DURATION_MS);

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
