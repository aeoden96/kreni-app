import { describe, expect, it } from 'vitest';

import type { ActiveTrip } from './gtfs';
import type { ParsedVehiclePosition } from './realtime';

import {
  computeVehicleStopProgress,
  getStopAwareProgress,
  interpolatePosition,
  mapRealtimeToVehiclePositions,
} from './vehicles';

describe('interpolatePosition', () => {
  it('returns [0,0] for empty shape', () => {
    expect(interpolatePosition([], 0.5)).toEqual([0, 0]);
  });

  it('returns the only point for single-point shape', () => {
    expect(interpolatePosition([[1, 2]], 0.5)).toEqual([1, 2]);
  });

  it('clamps to first point for progress <= 0', () => {
    const shape: [number, number][] = [
      [0, 0],
      [10, 0],
    ];
    expect(interpolatePosition(shape, 0)).toEqual([0, 0]);
    expect(interpolatePosition(shape, -1)).toEqual([0, 0]);
  });

  it('clamps to last point for progress >= 1', () => {
    const shape: [number, number][] = [
      [0, 0],
      [10, 0],
    ];
    expect(interpolatePosition(shape, 1)).toEqual([10, 0]);
    expect(interpolatePosition(shape, 2)).toEqual([10, 0]);
  });

  it('interpolates midpoint on equal-length segments', () => {
    const shape: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    // Total length 20; 0.5 => 10 along path => at (10, 0)
    expect(interpolatePosition(shape, 0.5)).toEqual([10, 0]);
  });

  it('interpolates within the first segment', () => {
    const shape: [number, number][] = [
      [0, 0],
      [10, 0],
    ];
    expect(interpolatePosition(shape, 0.25)).toEqual([2.5, 0]);
  });
});

describe('getStopAwareProgress', () => {
  it('returns 0 for empty stop times', () => {
    expect(getStopAwareProgress([], 100)).toBe(0);
  });

  it('returns first progress when before first stop', () => {
    const st: [number, number][] = [
      [100, 0.1],
      [200, 0.9],
    ];
    expect(getStopAwareProgress(st, 50)).toBe(0.1);
  });

  it('returns last progress when after last stop', () => {
    const st: [number, number][] = [
      [100, 0.1],
      [200, 0.9],
    ];
    expect(getStopAwareProgress(st, 300)).toBe(0.9);
  });

  it('linearly interpolates between two stops', () => {
    const st: [number, number][] = [
      [100, 0],
      [200, 1],
    ];
    expect(getStopAwareProgress(st, 150)).toBeCloseTo(0.5, 10);
  });

  it('returns progress1 when two consecutive stops share the same time', () => {
    const st: [number, number][] = [
      [90, 0],
      [100, 0.3],
      [100, 0.7],
      [110, 1],
    ];
    expect(getStopAwareProgress(st, 100)).toBe(0.3);
  });
});

describe('computeVehicleStopProgress', () => {
  it('returns 0 for empty or single stop', () => {
    expect(computeVehicleStopProgress(1, 1, [])).toBe(0);
    expect(computeVehicleStopProgress(1, 1, [{ lat: 0, lon: 0 }])).toBe(0);
  });

  it('returns fractional index at midpoint of first segment', () => {
    const stops = [
      { lat: 0, lon: 0 },
      { lat: 2, lon: 0 },
    ];
    expect(computeVehicleStopProgress(1, 0, stops)).toBeCloseTo(0.5, 10);
  });

  it('picks closer segment when vehicle is near second leg', () => {
    const stops = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
      { lat: 1, lon: 1 },
    ];
    // On second segment at (1, 0.5)
    const p = computeVehicleStopProgress(1, 0.5, stops);
    expect(p).toBeGreaterThan(1);
    expect(p).toBeLessThan(2);
  });

  it('clamps projection to segment endpoints', () => {
    const stops = [
      { lat: 0, lon: 0 },
      { lat: 1, lon: 0 },
    ];
    // Far east of segment — projects to end (1,0)
    const p = computeVehicleStopProgress(1, 5, stops);
    expect(p).toBeCloseTo(1, 10);
  });
});

describe('mapRealtimeToVehiclePositions', () => {
  const pos = (tripId: string, routeId: string): ParsedVehiclePosition => ({
    latitude: 45.8,
    longitude: 15.9,
    routeId,
    timestamp: 1_700_000_000,
    tripId,
    vehicleId: `v-${tripId}`,
  });

  const trip = (id: string): ActiveTrip => ({
    direction: 1,
    end: 600,
    headsign: 'Sopot',
    id,
    shapeId: '6_25',
    start: 540,
  });

  const positions = new Map([
    ['t1', pos('t1', '6')],
    ['t2', pos('t2', '7')],
  ]);
  const noUpdates = new Map();

  it('uses the trip index for membership, headsign and direction', () => {
    const result = mapRealtimeToVehiclePositions(positions, noUpdates, [trip('t1')], '6');
    expect(result.map((v) => v.tripId)).toEqual(['t1']);
    expect(result[0].headsign).toBe('Sopot');
    expect(result[0].direction).toBe(1);
  });

  it('falls back to the feed routeId while the trip index is empty', () => {
    const result = mapRealtimeToVehiclePositions(positions, noUpdates, [], '6');
    expect(result.map((v) => v.tripId)).toEqual(['t1']);
    expect(result[0].headsign).toBe('');
    expect(result[0].direction).toBe(0);
  });

  it('drops trips missing from a loaded index even when the routeId matches', () => {
    const result = mapRealtimeToVehiclePositions(positions, noUpdates, [trip('t3')], '6');
    expect(result).toEqual([]);
  });

  it('returns nothing without a trip index or a routeId', () => {
    expect(mapRealtimeToVehiclePositions(positions, noUpdates, [], null)).toEqual([]);
  });
});
