import { describe, it, expect } from 'vitest';
import { bearingToDirection } from './gtfs';

describe('bearingToDirection', () => {
  it('converts compass bearing to Croatian direction label', () => {
    expect(bearingToDirection(0)).toBe('sjeveru');
    expect(bearingToDirection(90)).toBe('istoku');
    expect(bearingToDirection(180)).toBe('jugu');
    expect(bearingToDirection(270)).toBe('zapadu');
  });
});
