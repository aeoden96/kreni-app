import { describe, expect, it } from 'vitest';

import { indexByTripKey, matchRealtime, tripKey, tripServiceId } from './tripIdMatch';

// Shapes taken from the real feeds on 2026-07-29: static data carried services
// 0_20–0_34 while realtime ran entirely on 0_40.
const STATIC_ID = '0_21_10101_101_10165';
const LIVE_ID = '0_40_10101_101_10165';

describe('tripKey', () => {
  it('drops the agency_service prefix', () => {
    expect(tripKey(STATIC_ID)).toBe('10101_101_10165');
  });

  it('gives the same key for the same trip across feed publications', () => {
    expect(tripKey(LIVE_ID)).toBe(tripKey(STATIC_ID));
  });

  it('refuses off-shape ids rather than guessing', () => {
    expect(tripKey('0_21_10101_101')).toBeNull(); // too few segments
    expect(tripKey('0_21_10101_101_10165_9')).toBeNull(); // too many
    expect(tripKey('0__10101_101_10165')).toBeNull(); // empty segment
    expect(tripKey('')).toBeNull();
  });
});

describe('tripServiceId', () => {
  it('returns the renumbered prefix', () => {
    expect(tripServiceId(STATIC_ID)).toBe('0_21');
    expect(tripServiceId(LIVE_ID)).toBe('0_40');
  });

  it('refuses off-shape ids', () => {
    expect(tripServiceId('nonsense')).toBeNull();
  });
});

describe('indexByTripKey', () => {
  it('re-keys entries by the stable part', () => {
    const index = indexByTripKey(new Map([[LIVE_ID, 'vehicle']]));
    expect(index.get('10101_101_10165')).toBe('vehicle');
  });

  it('drops keys reachable from more than one entry', () => {
    // Same trip key under two different service prefixes — unresolvable, so
    // neither wins: a wrong live vehicle is worse than none.
    const index = indexByTripKey(
      new Map([
        ['0_40_10101_101_10165', 'a'],
        ['0_41_10101_101_10165', 'b'],
      ])
    );
    expect(index.has('10101_101_10165')).toBe(false);
  });

  it('skips off-shape ids without discarding the rest', () => {
    const index = indexByTripKey(
      new Map([
        ['garbage', 'x'],
        [LIVE_ID, 'vehicle'],
      ])
    );
    expect(index.size).toBe(1);
    expect(index.get('10101_101_10165')).toBe('vehicle');
  });
});

describe('matchRealtime', () => {
  const exact = new Map([[STATIC_ID, 'exact-hit']]);
  const byKey = indexByTripKey(new Map([[LIVE_ID, 'drift-hit']]));

  it('prefers the exact id even when a drift match exists', () => {
    expect(matchRealtime(exact, byKey, STATIC_ID, true)).toBe('exact-hit');
  });

  it('falls back to the stable key when the exact id misses', () => {
    expect(matchRealtime(new Map(), byKey, STATIC_ID, true)).toBe('drift-hit');
  });

  it('does not fall back when the caller says the service is not active', () => {
    // The guard that stops Saturday's variant surfacing on a Wednesday.
    expect(matchRealtime(new Map(), byKey, STATIC_ID, false)).toBeUndefined();
  });

  it('returns undefined for an off-shape id instead of throwing', () => {
    expect(matchRealtime(new Map(), byKey, 'garbage', true)).toBeUndefined();
  });
});
