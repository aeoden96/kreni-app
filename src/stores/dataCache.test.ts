/**
 * Covers the two properties the cache was rewritten to get: writes stay
 * proportional to what was fetched, and retention is bounded.
 *
 * These run against `fake-indexeddb` (wired up in `test/setup`), so the store
 * semantics — separate records, structured clone, deletion — are the real ones
 * rather than a stand-in.
 */

import { createStore, entries } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cachedFetch, cachedFetchWithTTL, clearPayloadCache } from './dataCache';

/** Must match the store and index key the module under test uses. */
const payloadStore = createStore('kreni-gtfs-cache', 'payloads');

const INDEX_KEY = '\u0000index';

/** Every payload record, i.e. the store minus its bookkeeping entry. */
async function payloadKeys(): Promise<string[]> {
  const all = await entries(payloadStore);
  return all
    .map(([key]) => String(key))
    .filter((key) => key !== INDEX_KEY)
    .sort();
}

/** A payload that serialises to at least `bytes`, so budgets can be provoked. */
function payloadOfSize(bytes: number): { blob: string } {
  return { blob: 'x'.repeat(bytes) };
}

describe('dataCache', () => {
  beforeEach(async () => {
    await clearPayloadCache();
  });

  it('stores each URL as its own record rather than one combined blob', async () => {
    await cachedFetch('/data/a.json', () => Promise.resolve({ v: 'a' }));
    await cachedFetch('/data/b.json', () => Promise.resolve({ v: 'b' }));
    await cachedFetch('/data/c.json', () => Promise.resolve({ v: 'c' }));

    // The regression this guards: a single record holding all three would mean
    // every write rewrites every previously cached file.
    expect(await payloadKeys()).toEqual(['/data/a.json', '/data/b.json', '/data/c.json']);
  });

  it('serves a second request from cache without calling the fetcher again', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ v: 1 }));

    await cachedFetch('/data/x.json', fetcher);
    const second = await cachedFetch('/data/x.json', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second).toEqual({ v: 1 });
  });

  it('shares one in-flight promise between concurrent callers', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ v: 1 }));

    const results = await Promise.all([
      cachedFetch('/data/y.json', fetcher),
      cachedFetch('/data/y.json', fetcher),
      cachedFetch('/data/y.json', fetcher),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ v: 1 }, { v: 1 }, { v: 1 }]);
  });

  it('refetches once an entry is older than its TTL', async () => {
    const fetcher = vi.fn(() => Promise.resolve({ v: 1 }));
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);

    await cachedFetchWithTTL('/data/ttl.json', fetcher, 60_000);
    now.mockReturnValue(1_000_000 + 30_000);
    await cachedFetchWithTTL('/data/ttl.json', fetcher, 60_000);
    expect(fetcher).toHaveBeenCalledTimes(1);

    now.mockReturnValue(1_000_000 + 61_000);
    await cachedFetchWithTTL('/data/ttl.json', fetcher, 60_000);
    expect(fetcher).toHaveBeenCalledTimes(2);

    now.mockRestore();
  });

  it('evicts the least recently used entries once over the byte budget', async () => {
    // MAX_BYTES is 40 MB; six 8 MB payloads cannot all be kept.
    const eightMB = 8 * 1024 * 1024;
    const urls = ['a', 'b', 'c', 'd', 'e', 'f'].map((n) => `/data/big-${n}.json`);

    const now = vi.spyOn(Date, 'now');
    for (const [i, url] of urls.entries()) {
      // Distinct timestamps so "least recently used" is well defined.
      now.mockReturnValue(1_000_000 + i * 1000);
      await cachedFetch(url, () => Promise.resolve(payloadOfSize(eightMB)));
    }
    now.mockRestore();

    const kept = await payloadKeys();
    expect(kept.length).toBeLessThan(urls.length);
    // The newest write must survive; the oldest must be the one dropped.
    expect(kept).toContain('/data/big-f.json');
    expect(kept).not.toContain('/data/big-a.json');
  });

  it('drops every payload when the cache is cleared', async () => {
    await cachedFetch('/data/one.json', () => Promise.resolve({ v: 1 }));
    await cachedFetch('/data/two.json', () => Promise.resolve({ v: 2 }));
    expect(await payloadKeys()).toHaveLength(2);

    await clearPayloadCache();

    expect(await payloadKeys()).toHaveLength(0);
    // And a subsequent read is a genuine miss, not a stale index hit.
    const fetcher = vi.fn(() => Promise.resolve({ v: 'refetched' }));
    await cachedFetch('/data/one.json', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
