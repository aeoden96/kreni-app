import { describe, expect, it } from 'vitest';

import type { Stop } from './gtfs';

import {
  buildDirectionalStopPinPathData,
  buildParentLabelGroups,
  DIRECTIONAL_PIN_HALF_ANGLE_DEG,
  estimateSpiderRouteBadgeRowWidth,
  SPIDER_BADGE_CHAR_PX,
  SPIDER_BADGE_GAP,
  SPIDER_BADGE_H_PAD,
  SPIDER_BADGE_MIN_W,
  SPIDER_BADGE_MOON_PX,
} from './stopMarkersMath';

describe('buildDirectionalStopPinPathData', () => {
  it('returns closed SVG path with move, line, and arc', () => {
    const cx = 16;
    const d = buildDirectionalStopPinPathData(cx);
    expect(d.startsWith(`M ${cx},0`)).toBe(true);
    expect(d).toMatch(/ A [\d.]+,[\d.]+ 0 1 0 /);
    expect(d.endsWith(' Z')).toBe(true);
  });

  it('uses configured half-angle (sanity: path length scales with cx)', () => {
    expect(DIRECTIONAL_PIN_HALF_ANGLE_DEG).toBe(48);
    const small = buildDirectionalStopPinPathData(10);
    const large = buildDirectionalStopPinPathData(20);
    expect(large.length).toBeGreaterThan(small.length);
  });
});

describe('estimateSpiderRouteBadgeRowWidth', () => {
  it('returns 0 for empty list', () => {
    expect(estimateSpiderRouteBadgeRowWidth([])).toBe(0);
  });

  it('applies min width and gap between badges', () => {
    const one = estimateSpiderRouteBadgeRowWidth(['1']);
    expect(one).toBe(SPIDER_BADGE_MIN_W);

    const two = estimateSpiderRouteBadgeRowWidth(['1', '2']);
    expect(two).toBe(SPIDER_BADGE_MIN_W + SPIDER_BADGE_GAP + SPIDER_BADGE_MIN_W);
  });

  it('grows with long short names', () => {
    const longName = '999';
    const w = estimateSpiderRouteBadgeRowWidth([longName]);
    expect(w).toBe(longName.length * SPIDER_BADGE_CHAR_PX + SPIDER_BADGE_H_PAD);
  });

  it('reserves room for the moon glyph on night lines', () => {
    // '33' is a night line, '13' is not — same character count, so the whole
    // difference is the moon.
    expect(estimateSpiderRouteBadgeRowWidth(['33'])).toBe(
      estimateSpiderRouteBadgeRowWidth(['13']) + SPIDER_BADGE_MOON_PX
    );
  });
});

function parentStop(id: string, name: string, lat: number, lon: number): Stop {
  return {
    code: id,
    id,
    lat,
    locationType: 1,
    lon,
    name,
    parentStation: null,
  };
}

function platformStop(id: string, parentId: string, lat = 0, lon = 0): Stop {
  return {
    code: id,
    id,
    lat,
    locationType: 0,
    lon,
    name: `platform-${id}`,
    parentStation: parentId,
  };
}

describe('buildParentLabelGroups', () => {
  it('returns one group per parent when names differ', () => {
    const p1 = parentStop('p1', 'Station A', 45, 16);
    const p2 = parentStop('p2', 'Station B', 45.01, 16);
    const map = new Map([
      ['p1', p1],
      ['p2', p2],
    ]);
    const platforms = [platformStop('c1', 'p1'), platformStop('c2', 'p2')];
    const groups = buildParentLabelGroups(platforms, map);
    expect(groups).toHaveLength(2);
  });

  it('merges same-named parents at the same coordinates', () => {
    const p1 = parentStop('p1', 'Central', 45, 16);
    const p2 = parentStop('p2', 'Central', 45, 16);
    const map = new Map([
      ['p1', p1],
      ['p2', p2],
    ]);
    const platforms = [platformStop('c1', 'p1'), platformStop('c2', 'p2')];
    const groups = buildParentLabelGroups(platforms, map);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Central');
    expect(groups[0].lat).toBe(45);
    expect(groups[0].lon).toBe(16);
    expect(groups[0].children).toHaveLength(2);
  });

  it('splits same-named parents when too far apart', () => {
    const p1 = parentStop('p1', 'Central', 0, 0);
    const p2 = parentStop('p2', 'Central', 10, 0);
    const map = new Map([
      ['p1', p1],
      ['p2', p2],
    ]);
    const platforms = [platformStop('c1', 'p1'), platformStop('c2', 'p2')];
    const groups = buildParentLabelGroups(platforms, map);
    expect(groups).toHaveLength(2);
    expect(groups[0].children).toHaveLength(1);
    expect(groups[1].children).toHaveLength(1);
  });
});
