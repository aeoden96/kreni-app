import { describe, it, expect } from 'vitest';
import {
  computeOffScreenIndicator,
  OFF_SCREEN_INDICATOR_MARGIN_PX,
} from './offScreenIndicator';

const box = { north: 1, south: 0, east: 1, west: 0 };

describe('computeOffScreenIndicator', () => {
  it('returns null when lat or lon span is zero', () => {
    expect(
      computeOffScreenIndicator(0.5, 0.5, { north: 1, south: 1, east: 1, west: 0 }, 400, 400),
    ).toBeNull();
    expect(
      computeOffScreenIndicator(0.5, 0.5, { north: 1, south: 0, east: 0, west: 0 }, 400, 400),
    ).toBeNull();
  });

  it('returns null when stop projects inside the pixel frame', () => {
    expect(computeOffScreenIndicator(0.5, 0.5, box, 400, 400)).toBeNull();
  });

  it('returns null when inset rect is degenerate (margin too large)', () => {
    const w = 100;
    const h = 100;
    const m = 60; // maxX=40, minX=60 → invalid
    expect(
      computeOffScreenIndicator(2, 0.5, box, w, h, m),
    ).toBeNull();
  });

  it('places indicator toward north with angle ~0°', () => {
    const r = computeOffScreenIndicator(1.2, 0.5, box, 400, 400);
    expect(r).not.toBeNull();
    expect(r!.angle).toBeCloseTo(0, 5);
    expect(r!.y).toBe(OFF_SCREEN_INDICATOR_MARGIN_PX);
    expect(r!.x).toBe(200);
  });

  it('places indicator toward east with angle ~90°', () => {
    const r = computeOffScreenIndicator(0.5, 1.2, box, 400, 400);
    expect(r).not.toBeNull();
    expect(r!.angle).toBeCloseTo(90, 5);
    expect(r!.x).toBe(400 - OFF_SCREEN_INDICATOR_MARGIN_PX);
    expect(r!.y).toBe(200);
  });

  it('uses custom margin', () => {
    const m = 10;
    const r = computeOffScreenIndicator(1.2, 0.5, box, 400, 400, m);
    expect(r).not.toBeNull();
    expect(r!.y).toBe(m);
  });
});
