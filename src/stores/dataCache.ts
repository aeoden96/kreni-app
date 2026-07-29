/**
 * Persistent cache for the static GTFS JSON files, plus the version metadata
 * that decides when to throw it away.
 *
 * Payloads live one IndexedDB record per URL. That is the whole point of this
 * module's shape, so it is worth stating why: they used to live inside a
 * Zustand `persist` blob, and `persist` re-serialises its *entire* state on
 * every `set`. Caching one more file therefore rewrote every file already
 * cached, making the bytes written over a session quadratic in the number of
 * files opened. Measured against the real dataset (2528 stops, 154 routes,
 * ~200 MB total), a user who opens 400 stops and 80 routes ends up holding a
 * 63 MB cache that was written 26 GB of times. Chromium backs IndexedDB with
 * LevelDB and only reclaims superseded records when it compacts, so that write
 * volume is what surfaces in the browser's "Cookies and site data" as tens of
 * gigabytes of apparently inexplicable usage.
 *
 * One record per URL makes the write volume linear in what is actually
 * fetched, and the LRU budget below bounds what is retained.
 */

import { clear, createStore, del, delMany, get, set } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { indexedDBStorage } from './indexedDBStorage';

/** Dedicated database, so payload eviction can never disturb the metadata. */
const payloadStore = createStore('kreni-gtfs-cache', 'payloads');

/**
 * Record holding {@link CacheIndex}. Safe to keep alongside the payloads: every
 * other key in this store is a URL, and a URL cannot contain a NUL.
 */
const INDEX_KEY = '\u0000index';

/**
 * Retention budget. Both are enforced and whichever binds first wins.
 *
 * 40 MB comfortably covers a heavy session — `initial.json`, a hundred-odd stop
 * timetables at ~45 KB and a few dozen route timetables at ~293 KB — while
 * capping the worst case at a fifth of the full dataset instead of leaving it
 * unbounded, which is what the old cache was between feed republications.
 */
const MAX_BYTES = 40 * 1024 * 1024;
const MAX_ENTRIES = 400;

/**
 * How stale an entry's LRU stamp may get before a read bothers to refresh it.
 * Without this, every cache hit would write the index back; an hour's
 * granularity is far finer than the eviction pressure needs.
 */
const LRU_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** Where the payload cache stood at the last {@link getCacheStats} call. */
export interface CacheStats {
  /** Files this module is currently holding. */
  entryCount: number;
  /**
   * Everything the origin stores, as the browser accounts for it — this cache,
   * the service worker's response caches, localStorage, the lot. This is the
   * number shown under "Cookies and site data". `null` where
   * `navigator.storage.estimate` is unavailable.
   */
  originBytes: null | number;
  /** Sum of the payloads this module is holding. */
  sizeBytes: number;
}

type CacheIndex = Record<string, CacheIndexEntry>;

interface CacheIndexEntry {
  /** Serialised size, since the budget is by size rather than count. */
  bytes: number;
  /** Last read, for LRU eviction. */
  used: number;
  /** Write time, for {@link cachedFetchWithTTL} freshness. */
  written: number;
}

interface DataCacheState {
  getVersionForKey: (key: string) => string | undefined;
  setVersion: (version: string) => void;
  setVersionForKey: (key: string, version: string) => void;
  /** Legacy single-dataset version, kept in sync with `versions['data/manifest.json']`. */
  version: null | string;
  /** Per-manifest version keys, e.g. { 'data/manifest.json': 'v1', 'data-train/manifest.json': 'v2' } */
  versions: Record<string, string>;
}

/**
 * Metadata only — a handful of short strings. Payloads deliberately do not go
 * here; see the note at the top of the file.
 */
export const useDataCacheStore = create<DataCacheState>()(
  persist(
    (set_, get_) => ({
      getVersionForKey: (key: string): string | undefined => {
        return get_().versions[key];
      },

      setVersion: (version: string) => {
        set_({ version });
      },

      setVersionForKey: (key: string, version: string) => {
        set_((state) => ({ versions: { ...state.versions, [key]: version } }));
      },

      version: null,

      versions: {},
    }),
    {
      // Renamed from 'gtfs-data-cache' on purpose. That record still holds the
      // old payload blob for existing users; reusing the name would rehydrate
      // it — hundreds of megabytes into memory — before the first write shrank
      // it back down. A new name means it is never read, and `dropLegacyCache`
      // deletes it outright on the next load.
      name: 'gtfs-cache-meta',
      partialize: (state) => ({ version: state.version, versions: state.versions }),
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
);

/**
 * In-flight request deduplication.
 *
 * Covers the cache read as well as the network fetch, so concurrent callers for
 * the same URL share one IndexedDB round trip instead of racing each other.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function cachedFetch<T>(url: string, fetcher: () => Promise<T>): Promise<T> {
  return resolve(url, fetcher, undefined);
}

/**
 * Like {@link cachedFetch}, but entries written more than `ttlMs` ago are
 * treated as misses and refetched.
 */
export function cachedFetchWithTTL<T>(
  url: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  return resolve(url, fetcher, ttlMs);
}

/**
 * Check and update cache version from manifest.
 * @param manifestRelPath - relative path under BASE_URL, defaults to 'data/manifest.json'
 */
export async function checkCacheVersion(manifestRelPath = 'data/manifest.json'): Promise<void> {
  try {
    const url = `${import.meta.env.BASE_URL}${manifestRelPath}`;
    const response = await dataFetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${manifestRelPath}`);
      return;
    }

    const manifest = await response.json();
    const newVersion = manifest.version;

    const store = useDataCacheStore.getState();
    // Use per-key versioning; fall back to legacy global `version` for the default manifest
    const currentVersion =
      manifestRelPath === 'data/manifest.json'
        ? (store.getVersionForKey(manifestRelPath) ?? store.version)
        : store.getVersionForKey(manifestRelPath);

    if (currentVersion && currentVersion !== newVersion) {
      console.log(
        `Cache version mismatch for ${manifestRelPath} (${currentVersion} -> ${newVersion}), clearing cache`
      );
      // Awaited, not fired off: callers (`useInitialData`) fetch as soon as this
      // resolves, and a clear landing after that write would drop the new data.
      await clearPayloadCache();
    }

    store.setVersionForKey(manifestRelPath, newVersion);
    // Keep legacy field in sync for the default manifest
    if (manifestRelPath === 'data/manifest.json') {
      store.setVersion(newVersion);
    }
  } catch (error) {
    console.warn('Failed to check cache version:', error);
  }
}

/** Drop every cached payload, and the service worker's copy of the same files. */
export async function clearPayloadCache(): Promise<void> {
  try {
    await clear(payloadStore);
  } catch (error) {
    console.warn('Failed to clear payload cache:', error);
  }
  indexPromise = Promise.resolve({});

  if (typeof caches !== 'undefined') {
    await caches.delete('gtfs-data').catch(() => false);
  }
}

/**
 * Thin fetch wrapper that attaches the custom `X-App-Request` header to every
 * data-file request.  Pair this with a Cloudflare WAF rule that blocks requests
 * to `/data/*` and `/static_data/*` lacking this header to add a lightweight
 * friction layer against bulk scraping:
 *
 *   (http.request.uri.path contains "/data/" or
 *    http.request.uri.path contains "/static_data/")
 *   and not (http.request.headers["x-app-request"][0] == "1")
 */
export function dataFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      'X-App-Request': '1',
      ...init?.headers,
    },
  });
}

/**
 * What this cache holds, plus what the browser thinks the whole origin costs.
 *
 * The two are reported separately on purpose: they diverging is the signal that
 * something outside this module — service worker caches, or IndexedDB that has
 * not compacted yet — is the one using the space.
 */
export async function getCacheStats(): Promise<CacheStats> {
  const index = await loadIndex();
  const entries = Object.values(index);

  let originBytes: null | number = null;
  try {
    originBytes = (await navigator.storage.estimate()).usage ?? null;
  } catch {
    // Unsupported or blocked by privacy settings — report only our own figure.
  }

  return {
    entryCount: entries.length,
    originBytes,
    sizeBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  };
}

/**
 * Remove the pre-split payload blob.
 *
 * Existing installs still carry it under the old `persist` key, and nothing
 * reads it any more — so without this it would sit in IndexedDB indefinitely,
 * which for a heavy user is most of the storage this change is meant to
 * reclaim. Cheap and idempotent, so it runs unconditionally at load.
 */
const dropLegacyCache = () => {
  try {
    localStorage.removeItem('gtfs-data-cache');
  } catch {
    // localStorage unavailable (private mode / disabled) — nothing to reclaim.
  }
  void del('gtfs-data-cache').catch(() => {});
};

dropLegacyCache();

let indexPromise: null | Promise<CacheIndex> = null;

/**
 * Drop least-recently-used entries until the index is back inside budget.
 * Mutates `index`; the caller persists it.
 */
async function evict(index: CacheIndex): Promise<void> {
  let totalBytes = 0;
  for (const entry of Object.values(index)) totalBytes += entry.bytes;

  let count = Object.keys(index).length;
  if (totalBytes <= MAX_BYTES && count <= MAX_ENTRIES) return;

  const oldestFirst = Object.keys(index).sort((a, b) => index[a].used - index[b].used);

  const doomed: string[] = [];
  for (const key of oldestFirst) {
    if (totalBytes <= MAX_BYTES && count <= MAX_ENTRIES) break;
    totalBytes -= index[key].bytes;
    count -= 1;
    doomed.push(key);
    delete index[key];
  }

  if (doomed.length > 0) await delMany(doomed, payloadStore);
}

function loadIndex(): Promise<CacheIndex> {
  indexPromise ??= get<CacheIndex>(INDEX_KEY, payloadStore)
    .then((stored) => stored ?? {})
    .catch(() => ({}));
  return indexPromise;
}

async function readPayload<T>(url: string, ttlMs: number | undefined): Promise<T | undefined> {
  const index = await loadIndex();
  const meta = index[url];
  if (!meta) return undefined;

  const now = Date.now();
  if (ttlMs !== undefined && now - meta.written > ttlMs) return undefined;

  let payload: T | undefined;
  try {
    payload = await get<T>(url, payloadStore);
  } catch (error) {
    console.warn('Failed to read cached payload:', error);
    return undefined;
  }

  // A missing record against a present index entry means the two fell out of
  // step (an interrupted write, or storage cleared underneath us). Forget it
  // and let the caller refetch.
  if (payload === undefined) {
    delete index[url];
    return undefined;
  }

  if (now - meta.used > LRU_TOUCH_INTERVAL_MS) {
    meta.used = now;
    void set(INDEX_KEY, index, payloadStore).catch(() => {});
  }

  return payload;
}

/** Cache hit, in-flight join, or fetch — in that order. */
function resolve<T>(url: string, fetcher: () => Promise<T>, ttlMs: number | undefined): Promise<T> {
  const existing = inFlight.get(url);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    const cached = await readPayload<T>(url, ttlMs);
    if (cached !== undefined) return cached;

    const data = await fetcher();
    await writePayload(url, data);
    return data;
  })().finally(() => {
    inFlight.delete(url);
  });

  inFlight.set(url, promise as Promise<unknown>);
  return promise;
}

async function writePayload(url: string, data: unknown): Promise<void> {
  let bytes: number;
  try {
    // Sizing the payload costs one serialisation of one file, on data that was
    // just parsed anyway. The record itself is stored by structured clone, so
    // this is O(payload) per network fetch — not O(whole cache) per write,
    // which is the trap the previous implementation fell into.
    bytes = JSON.stringify(data).length;
  } catch {
    // Not serialisable (cycles, BigInt) — nothing worth persisting.
    return;
  }

  try {
    const index = await loadIndex();
    await set(url, data, payloadStore);

    const now = Date.now();
    index[url] = { bytes, used: now, written: now };

    await evict(index);
    await set(INDEX_KEY, index, payloadStore);
  } catch (error) {
    // Quota exhaustion and private-mode failures are non-fatal: the data is
    // already in hand for this session and will simply be refetched next time.
    console.warn('Failed to cache payload:', error);
  }
}
