import { describe, expect, it } from 'vitest';

import { isNightRoute, isNightTime, NIGHT_LINE_SHORT_NAMES } from './nightLines';

describe('isNightRoute', () => {
  it('matches the four ZET night trams', () => {
    for (const shortName of ['31', '32', '33', '34']) {
      expect(isNightRoute({ shortName })).toBe(true);
    }
  });

  it('does not match day lines', () => {
    for (const shortName of ['3', '4', '13', '133', '311', '3A']) {
      expect(isNightRoute({ shortName })).toBe(false);
    }
  });

  it('tolerates a missing route', () => {
    expect(isNightRoute(null)).toBe(false);
    expect(isNightRoute(undefined)).toBe(false);
  });

  it('exposes exactly the four night lines', () => {
    expect([...NIGHT_LINE_SHORT_NAMES].sort()).toEqual(['31', '32', '33', '34']);
  });
});

describe('isNightTime', () => {
  const at = (h: number, m = 0) => h * 60 + m;

  it('is night from 23:00 through 04:59', () => {
    expect(isNightTime(at(23))).toBe(true);
    expect(isNightTime(at(23, 30))).toBe(true);
    expect(isNightTime(at(0))).toBe(true);
    expect(isNightTime(at(3))).toBe(true);
    expect(isNightTime(at(4, 59))).toBe(true);
  });

  it('is day from 05:00 through 22:59', () => {
    expect(isNightTime(at(5))).toBe(false);
    expect(isNightTime(at(12))).toBe(false);
    expect(isNightTime(at(22, 59))).toBe(false);
  });

  it('wraps readings past midnight, as GTFS times run to 24:00+', () => {
    // 25:30 in GTFS terms is 01:30 the next day — still night.
    expect(isNightTime(at(25, 30))).toBe(true);
    // 27:00 is 03:00 — still night; 29:00 is 05:00 — day.
    expect(isNightTime(at(27))).toBe(true);
    expect(isNightTime(at(29))).toBe(false);
  });
});
