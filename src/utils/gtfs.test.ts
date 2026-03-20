import { describe, it, expect } from 'vitest';
import { bearingToCompassKey } from './gtfs';

describe('bearingToCompassKey', () => {
  it('maps bearing to stable compass keys', () => {
    expect(bearingToCompassKey(0)).toBe('n');
    expect(bearingToCompassKey(90)).toBe('e');
    expect(bearingToCompassKey(180)).toBe('s');
    expect(bearingToCompassKey(270)).toBe('w');
  });
});
