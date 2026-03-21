import { describe, it, expect } from 'vitest';
import {
  bearingToCompassKey,
  minutesToTime,
  timeToMinutes,
  formatTime24h,
  calculateDistance,
  findNearestStops,
  getNextDepartures,
  type Stop,
} from './gtfs';

describe('bearingToCompassKey', () => {
  it('maps cardinal directions to stable keys', () => {
    expect(bearingToCompassKey(0)).toBe('n');
    expect(bearingToCompassKey(90)).toBe('e');
    expect(bearingToCompassKey(180)).toBe('s');
    expect(bearingToCompassKey(270)).toBe('w');
  });

  it('maps intercardinal directions', () => {
    expect(bearingToCompassKey(45)).toBe('ne');
    expect(bearingToCompassKey(135)).toBe('se');
    expect(bearingToCompassKey(225)).toBe('sw');
    expect(bearingToCompassKey(315)).toBe('nw');
  });

  it('normalizes negative and over-360 bearings', () => {
    expect(bearingToCompassKey(-90)).toBe('w');
    expect(bearingToCompassKey(450)).toBe('e'); // 90
    expect(bearingToCompassKey(-45)).toBe('nw');
  });
});

describe('minutesToTime', () => {
  it('formats minutes from midnight as HH:MM', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(90)).toBe('01:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });
});

describe('timeToMinutes', () => {
  it('parses HH:MM to minutes from midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('01:30')).toBe(90);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
});

describe('formatTime24h', () => {
  it('wraps hours modulo 24 and pads', () => {
    expect(formatTime24h(0)).toBe('00:00');
    expect(formatTime24h(90)).toBe('01:30');
    expect(formatTime24h(1500)).toBe('01:00'); // 25h -> 01:00
  });
});

describe('calculateDistance', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistance(45.8, 15.98, 45.8, 15.98)).toBe(0);
  });

  it('returns ~111 km for ~1° latitude difference (km)', () => {
    const km = calculateDistance(45, 16, 46, 16);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });
});

describe('findNearestStops', () => {
  const baseStop = (id: string, lat: number, lon: number): Stop => ({
    id,
    code: id,
    name: id,
    lat,
    lon,
    locationType: 0,
    parentStation: null,
  });

  it('orders by distance ascending and respects limit', () => {
    const stops = [
      baseStop('far', 46, 16),
      baseStop('near', 45.001, 16),
      baseStop('mid', 45.5, 16),
    ];
    const result = findNearestStops(stops, 45, 16, 2);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('near');
    expect(result[1].id).toBe('mid');
    expect(result[0].distance).toBeLessThan(result[1].distance);
  });
});

describe('getNextDepartures', () => {
  it('returns upcoming times in order up to count', () => {
    const times = [100, 200, 300, 400];
    expect(getNextDepartures(times, 150, 5)).toEqual([200, 300, 400]);
    expect(getNextDepartures(times, 150, 2)).toEqual([200, 300]);
  });

  it('includes departures exactly at current time', () => {
    expect(getNextDepartures([100, 200], 100, 5)).toEqual([100, 200]);
  });

  it('returns empty when nothing is upcoming', () => {
    expect(getNextDepartures([10, 20], 100, 5)).toEqual([]);
  });
});
