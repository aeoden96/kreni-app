import { describe, expect, it } from 'vitest';

import type { Route } from './gtfs';

import { getRouteSuspension, parseFeedDate } from './routeService';

function makeRoute(serviceGaps?: Route['serviceGaps']): Route {
  return { id: '13', longName: 'Žitnjak - Kvaternikov trg', serviceGaps, shortName: '13', type: 0 };
}

/** Tram 13's real suspension in feed 000391. */
const TRAM_13 = makeRoute([{ from: '20260713', until: '20260810' }]);

describe('getRouteSuspension', () => {
  it('reports the gap a route is currently inside', () => {
    expect(getRouteSuspension(TRAM_13, new Date(2026, 6, 25))).toEqual({ until: '20260810' });
  });

  it('includes the first day of the gap', () => {
    expect(getRouteSuspension(TRAM_13, new Date(2026, 6, 13))).toEqual({ until: '20260810' });
  });

  it('treats the `until` date as running again', () => {
    // Half-open range: service resumes ON 20260810, so that day is not suspended.
    expect(getRouteSuspension(TRAM_13, new Date(2026, 7, 10))).toBeNull();
    expect(getRouteSuspension(TRAM_13, new Date(2026, 7, 9))).toEqual({ until: '20260810' });
  });

  it('returns null before the gap opens', () => {
    expect(getRouteSuspension(TRAM_13, new Date(2026, 6, 12))).toBeNull();
  });

  it('returns null for a route with no gaps, or none at all', () => {
    expect(getRouteSuspension(makeRoute(), new Date(2026, 6, 25))).toBeNull();
    expect(getRouteSuspension(makeRoute([]), new Date(2026, 6, 25))).toBeNull();
  });

  it('returns null for a missing route', () => {
    expect(getRouteSuspension(null, new Date(2026, 6, 25))).toBeNull();
    expect(getRouteSuspension(undefined, new Date(2026, 6, 25))).toBeNull();
  });

  it('picks the matching gap when a route has several', () => {
    const route = makeRoute([
      { from: '20260713', until: '20260810' },
      { from: '20261201', until: '20270115' },
    ]);
    expect(getRouteSuspension(route, new Date(2026, 11, 20))).toEqual({ until: '20270115' });
    // Between the two gaps the route is running.
    expect(getRouteSuspension(route, new Date(2026, 9, 1))).toBeNull();
  });

  it('does not confuse month/day digits when comparing', () => {
    // 20261101 must not read as "before" 20260901 — string compare is safe only
    // because the format is zero-padded and fixed-width.
    const route = makeRoute([{ from: '20260901', until: '20261101' }]);
    expect(getRouteSuspension(route, new Date(2026, 9, 5))).toEqual({ until: '20261101' });
    expect(getRouteSuspension(route, new Date(2026, 10, 5))).toBeNull();
  });
});

describe('parseFeedDate', () => {
  it('parses a feed date into a local Date', () => {
    const d = parseFeedDate('20260810');
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 7, 10]);
  });
});
