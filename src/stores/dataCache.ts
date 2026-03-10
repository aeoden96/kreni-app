/**
 * Zustand store for caching GTFS data in IndexedDB
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from './indexedDBStorage';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

interface DataCacheState {
  cache: Record<string, CacheEntry>;
  version: string | null;
  /** Per-manifest version keys, e.g. { 'data/manifest.json': 'v1', 'data-train/manifest.json': 'v2' } */
  versions: Record<string, string>;
  
  // Actions
  setEntry: (key: string, data: unknown) => void;
  getEntry: <T>(key: string) => T | undefined;
  clearCache: () => void;
  setVersion: (version: string) => void;
  setVersionForKey: (key: string, version: string) => void;
  getVersionForKey: (key: string) => string | undefined;
  getCacheStats: () => { entryCount: number; sizeBytes: number };
}

/**
 * One-time migration from localStorage to IndexedDB
 * This ensures existing users don't lose their cached data
 */
const migrateFromLocalStorage = async () => {
  const STORAGE_KEY = 'gtfs-data-cache';
  
  try {
    const localStorageData = localStorage.getItem(STORAGE_KEY);
    if (localStorageData) {
      console.log('Migrating cache from localStorage to IndexedDB...');
      
      // Write to IndexedDB
      await indexedDBStorage.setItem?.(STORAGE_KEY, localStorageData);
      
      // Remove from localStorage to save space
      localStorage.removeItem(STORAGE_KEY);
      
      console.log('Cache migration completed successfully');
    }
  } catch (error) {
    console.warn('Failed to migrate cache from localStorage:', error);
  }
};

// Run migration on module load (only runs once per session)
migrateFromLocalStorage();

export const useDataCacheStore = create<DataCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      version: null,
      versions: {},

      setEntry: (key: string, data: unknown) => {
        set((state) => ({
          cache: {
            ...state.cache,
            [key]: {
              data,
              timestamp: Date.now(),
            },
          },
        }));
      },

      getEntry: <T,>(key: string): T | undefined => {
        const entry = get().cache[key];
        return entry?.data as T | undefined;
      },

      clearCache: () => {
        set({ cache: {} });
      },

      setVersion: (version: string) => {
        set({ version });
      },

      setVersionForKey: (key: string, version: string) => {
        set((state) => ({ versions: { ...state.versions, [key]: version } }));
      },

      getVersionForKey: (key: string): string | undefined => {
        return get().versions[key];
      },

      getCacheStats: () => {
        const state = get();
        const entryCount = Object.keys(state.cache).length;
        
        // Estimate size by measuring serialized state
        let sizeBytes = 0;
        try {
          const serialized = JSON.stringify(state.cache);
          sizeBytes = new Blob([serialized]).size;
        } catch {
          // If serialization fails, return 0
          sizeBytes = 0;
        }
        
        return { entryCount, sizeBytes };
      },
    }),
    {
      name: 'gtfs-data-cache',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
);

/**
 * In-flight request deduplication map.
 * If the same URL is requested while a fetch is already pending, all callers
 * share the same Promise so only one network request is made.
 */
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Helper function to fetch data with caching
 */
export async function cachedFetch<T>(
  url: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const store = useDataCacheStore.getState();

  // Check persistent cache first
  const cached = store.getEntry<T>(url);
  if (cached !== undefined) {
    return cached;
  }

  // Deduplicate concurrent requests for the same URL
  const existing = inFlight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  // Cache miss — start a new fetch and register it as in-flight
  const promise = fetcher().then((data) => {
    store.setEntry(url, data);
    return data;
  }).finally(() => {
    inFlight.delete(url);
  });

  inFlight.set(url, promise as Promise<unknown>);

  return promise;
}

/**
 * Check and update cache version from manifest.
 * @param manifestRelPath - relative path under BASE_URL, defaults to 'data/manifest.json'
 */
export async function checkCacheVersion(manifestRelPath = 'data/manifest.json'): Promise<void> {
  try {
    const url = `${import.meta.env.BASE_URL}${manifestRelPath}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${manifestRelPath}`);
      return;
    }
    
    const manifest = await response.json();
    const newVersion = manifest.version;
    
    const store = useDataCacheStore.getState();
    // Use per-key versioning; fall back to legacy global `version` for the default manifest
    const currentVersion = manifestRelPath === 'data/manifest.json'
      ? (store.getVersionForKey(manifestRelPath) ?? store.version)
      : store.getVersionForKey(manifestRelPath);
    
    if (currentVersion && currentVersion !== newVersion) {
      console.log(`Cache version mismatch for ${manifestRelPath} (${currentVersion} -> ${newVersion}), clearing cache`);
      store.clearCache();

      if ('caches' in window) {
        caches.delete('gtfs-data').catch(() => {});
      }
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
