import { describe, expect, it } from 'vitest';

import {
  computeBearing,
  enrichWithDeadReckoning,
  formatDelay,
  haversineDistance,
  type ParsedVehiclePosition,
  speedToKmh,
  type VehicleSnapshot,
} from './realtime';

describe('formatDelay', () => {
  it('returns empty string when undefined', () => {
    expect(formatDelay(undefined)).toBe('');
  });

  it('treats under 60s absolute as on time', () => {
    expect(formatDelay(0)).toBe('On time');
    expect(formatDelay(59)).toBe('On time');
    expect(formatDelay(-59)).toBe('On time');
  });

  it('formats late and early in minutes', () => {
    expect(formatDelay(120)).toBe('2 min kasni');
    expect(formatDelay(-120)).toBe('2 min prerano');
  });
});

describe('speedToKmh', () => {
  it('returns undefined when input undefined', () => {
    expect(speedToKmh(undefined)).toBeUndefined();
  });

  it('converts m/s to km/h rounded to one decimal', () => {
    expect(speedToKmh(10)).toBe(36); // 10 * 3.6
    expect(speedToKmh(1)).toBe(3.6);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for identical points', () => {
    expect(haversineDistance(45.8, 15.98, 45.8, 15.98)).toBe(0);
  });

  it('returns ~111 km for ~1° latitude (metres)', () => {
    const m = haversineDistance(45, 16, 46, 16);
    expect(m).toBeGreaterThan(110_000);
    expect(m).toBeLessThan(112_000);
  });
});

describe('computeBearing', () => {
  it('returns ~0° for due north', () => {
    expect(computeBearing(0, 0, 1, 0)).toBeCloseTo(0, 5);
  });

  it('returns ~90° for due east along the equator', () => {
    expect(computeBearing(0, 0, 0, 1)).toBeCloseTo(90, 5);
  });

  it('returns ~180° for due south', () => {
    expect(computeBearing(1, 0, 0, 0)).toBeCloseTo(180, 5);
  });
});

function vehicle(
  lat: number,
  lng: number,
  ts: number,
  overrides: Partial<ParsedVehiclePosition> = {}
): ParsedVehiclePosition {
  return {
    latitude: lat,
    longitude: lng,
    routeId: 'r1',
    timestamp: ts,
    tripId: 't1',
    vehicleId: 'v1',
    ...overrides,
  };
}

describe('enrichWithDeadReckoning', () => {
  it('returns current unchanged when dt < 3s', () => {
    const cur = vehicle(45, 16, 100);
    const prev: VehicleSnapshot = { latitude: 45, longitude: 16, timestamp: 98 };
    expect(enrichWithDeadReckoning(cur, prev)).toEqual(cur);
  });

  it('returns current unchanged when dt > 300s', () => {
    const cur = vehicle(45, 16, 400);
    const prev: VehicleSnapshot = { latitude: 45, longitude: 16, timestamp: 0 };
    expect(enrichWithDeadReckoning(cur, prev)).toEqual(cur);
  });

  it('returns current unchanged when movement < 5m', () => {
    const cur = vehicle(45.00001, 16, 100);
    const prev: VehicleSnapshot = { latitude: 45, longitude: 16, timestamp: 90 };
    expect(enrichWithDeadReckoning(cur, prev)).toEqual(cur);
  });

  it('derives bearing and speed when movement is sufficient', () => {
    // ~0.001° north ≈ 111 m; over 10 s => ~11 m/s (below 33 cap)
    const prev: VehicleSnapshot = { latitude: 45, longitude: 16, timestamp: 1_000 };
    const cur = vehicle(45.001, 16, 1_010);
    const out = enrichWithDeadReckoning(cur, prev);
    expect(out.bearing).toBeCloseTo(0, 3);
    expect(out.speed).toBeGreaterThan(5);
    expect(out.speed).toBeLessThan(20);
    expect(out.vehicleId).toBe(cur.vehicleId);
  });

  it('caps derived speed at 33 m/s', () => {
    const prev: VehicleSnapshot = { latitude: 45, longitude: 16, timestamp: 0 };
    const cur = vehicle(45.3, 16, 10); // large lat jump in 10s
    const out = enrichWithDeadReckoning(cur, prev);
    expect(out.speed).toBe(33);
  });
});
