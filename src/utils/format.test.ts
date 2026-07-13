import type { TFunction } from 'i18next';

import { describe, expect, it } from 'vitest';

import { formatDelay, formatDistance, formatMinutes } from './format';

// Minimal i18n stub that echoes key + interpolated {{time}}.
const t = ((key: string, opts?: { time?: string }) =>
  opts?.time ? `${key}:${opts.time}` : key) as unknown as TFunction;

describe('formatDelay', () => {
  it('reports late for delays over 30s', () => {
    expect(formatDelay(90, t)).toEqual({ positive: false, text: 'routeBar.delayLate:1 min 30 s' });
  });

  it('reports early for delays under -30s', () => {
    expect(formatDelay(-45, t)).toEqual({ positive: true, text: 'routeBar.delayEarly:45 s' });
  });

  it('reports on time within the ±30s dead zone', () => {
    expect(formatDelay(0, t)).toEqual({ positive: true, text: 'routeBar.onTime' });
    expect(formatDelay(30, t)).toEqual({ positive: true, text: 'routeBar.onTime' });
    expect(formatDelay(-30, t)).toEqual({ positive: true, text: 'routeBar.onTime' });
  });
});

describe('formatDistance', () => {
  it('uses metres below 1 km', () => {
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('uses kilometres at and above 1 km', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
    expect(formatDistance(2540)).toBe('2.5 km');
  });
});

describe('formatMinutes', () => {
  it('formats minutes-from-midnight as HH:MM', () => {
    expect(formatMinutes(0)).toBe('00:00');
    expect(formatMinutes(9 * 60 + 5)).toBe('09:05');
    expect(formatMinutes(23 * 60 + 59)).toBe('23:59');
  });

  it('applies the delay (seconds) and wraps past midnight', () => {
    expect(formatMinutes(10 * 60, 120)).toBe('10:02');
    expect(formatMinutes(23 * 60 + 59, 120)).toBe('00:01');
  });
});
