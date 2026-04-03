import { useEffect, useState } from 'react';

import { STATIC_DATA_URL } from '../config';
import { cachedFetch, cachedFetchWithTTL, dataFetch } from '../stores/dataCache';

const DEFAULT_STATIC_DATASET_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface UseStaticDatasetJsonOptions {
  logErrorLabel?: string;
  /** Default `DEFAULT_STATIC_DATASET_TTL_MS`. `null` uses `cachedFetch` (no TTL). */
  ttlMs?: null | number;
  /** When true, uses `dataFetch` (adds `X-App-Request`) instead of `fetch`. */
  useDataFetch?: boolean;
}

/**
 * Loads JSON from under {@link STATIC_DATA_URL} with IndexedDB-backed caching.
 * When `enabled` is false, does not clear existing data (layer toggle off).
 */
export function useStaticDatasetJson<T>(
  path: string,
  enabled: boolean,
  options?: UseStaticDatasetJsonOptions
): null | T {
  const rawTtl = options?.ttlMs;
  const ttlMs = rawTtl === undefined ? DEFAULT_STATIC_DATASET_TTL_MS : rawTtl;
  const useDataFetch = options?.useDataFetch ?? false;
  const logErrorLabel = options?.logErrorLabel;

  const [data, setData] = useState<null | T>(null);

  useEffect(() => {
    setData(null);
  }, [path]);

  useEffect(() => {
    if (!enabled) return;

    const url = resolveStaticDataUrl(path);
    const fetcher = () =>
      (useDataFetch ? dataFetch(url) : fetch(url)).then((r) => r.json() as Promise<T>);

    let cancelled = false;

    const promise =
      ttlMs === null ? cachedFetch<T>(url, fetcher) : cachedFetchWithTTL<T>(url, fetcher, ttlMs);

    promise
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        const label = logErrorLabel ? `${logErrorLabel}: ` : '';
        console.error(`Failed to load static dataset ${label}`, err);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, logErrorLabel, path, ttlMs, useDataFetch]);

  return data;
}

function resolveStaticDataUrl(path: string): string {
  const base = STATIC_DATA_URL.replace(/\/+$/, '');
  const segment = path.replace(/^\/+/, '');
  return `${base}/${segment}`;
}
