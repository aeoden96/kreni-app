/**
 * Pure math/helpers for map stop markers (directional pin SVG, spider badge sizing,
 * parent label merging). See StopMarkers.tsx.
 */

import type { Stop } from './gtfs';

import { calculateDistance } from './gtfs';
import { NIGHT_LINE_SHORT_NAMES } from './nightLines';

/** Half-angle (degrees) from vertical to tangent on the directional pin arc. */
export const DIRECTIONAL_PIN_HALF_ANGLE_DEG = 48;

/**
 * Inner hole of the terminus ring, as a fraction of the ring's radius.
 * Large enough to read as a ring rather than a dot with a speck in it, small
 * enough that the coloured band still carries the route colour at 32px.
 */
export const TERMINUS_INNER_RADIUS_RATIO = 0.45;

/**
 * How much larger a terminus ring is than an ordinary stop circle. End of the
 * line is the landmark you scan a map for, so it outweighs the through stops
 * around it rather than merely differing in shape. Stays well inside the icon
 * box at every size: 9px radius in a 32px box, 18px in the 64px selected box.
 */
export const TERMINUS_RADIUS_SCALE = 1.5;

/**
 * SVG path for the unified directional stop pin (tip up, circular cap below).
 * @param cx - Horizontal center and circle vertical center (= size / 2 in callers)
 */
export function buildDirectionalStopPinPathData(cx: number): string {
  const tipY = 0;
  const halfAngleRad = (DIRECTIONAL_PIN_HALF_ANGLE_DEG * Math.PI) / 180;
  const circleCy = cx;
  const arcR = circleCy * Math.cos(halfAngleRad);
  const xOff = arcR * Math.sin(halfAngleRad);
  const yOff = arcR * Math.cos(halfAngleRad);
  const x1 = cx - xOff;
  const y1 = circleCy - yOff;
  const x2 = cx + xOff;
  const y2 = circleCy - yOff;
  return `M ${cx},${tipY} L ${x1},${y1} A ${arcR},${arcR} 0 1 0 ${x2},${y2} Z`;
}

/** ~6.5px per character for 10px bold route short names */
export const SPIDER_BADGE_CHAR_PX = 6.5;
export const SPIDER_BADGE_H_PAD = 10;
export const SPIDER_BADGE_MIN_W = 18;
export const SPIDER_BADGE_GAP = 3;
export const SPIDER_TICKER_VISIBLE_PX = 110;
/** Moon glyph + its gap, added to night-line badges (see .spider-route-moon). */
export const SPIDER_BADGE_MOON_PX = 10;

interface ParentLabelGroup {
  children: Stop[];
  label: string;
  lat: number;
  lon: number;
}

/**
 * Estimated total width (px) of a row of route short-name badges (spiderfier label).
 *
 * Night-line badges carry a moon glyph after the number, so they measure wider
 * than their text alone. Getting this wrong only mis-picks the static-row vs
 * scrolling-ticker threshold, but that shows up as a clipped badge.
 */
export function estimateSpiderRouteBadgeRowWidth(shortNames: string[]): number {
  return shortNames.reduce(
    (sum, shortName, i) =>
      sum +
      Math.max(SPIDER_BADGE_MIN_W, shortName.length * SPIDER_BADGE_CHAR_PX + SPIDER_BADGE_H_PAD) +
      (NIGHT_LINE_SHORT_NAMES.has(shortName) ? SPIDER_BADGE_MOON_PX : 0) +
      (i > 0 ? SPIDER_BADGE_GAP : 0),
    0
  );
}

const PARENT_MERGE_THRESHOLD_KM = 60 / 1000;

/**
 * Group platform stops under parent stations; merge same-named parents within
 * {@link PARENT_MERGE_THRESHOLD_KM} of their centroid into one label.
 */
export function buildParentLabelGroups(
  platformStops: Stop[],
  parentById: Map<string, Stop>
): ParentLabelGroup[] {
  const childrenByParent = new Map<string, Stop[]>();
  for (const st of platformStops) {
    if (!st.parentStation) continue;
    const arr = childrenByParent.get(st.parentStation) ?? [];
    arr.push(st);
    childrenByParent.set(st.parentStation, arr);
  }

  const nameGroups = new Map<string, { children: Stop[]; parents: Stop[] }>();
  for (const [pid, children] of childrenByParent) {
    const parent = parentById.get(pid);
    if (!parent || children.length === 0) continue;
    const key = parent.name.trim().toLowerCase();
    const entry = nameGroups.get(key) ?? { children: [], parents: [] };
    entry.parents.push(parent);
    entry.children.push(...children);
    nameGroups.set(key, entry);
  }

  const groups: ParentLabelGroup[] = [];

  for (const entry of nameGroups.values()) {
    if (entry.parents.length === 1) {
      const p = entry.parents[0];
      groups.push({ children: entry.children, label: p.name, lat: p.lat, lon: p.lon });
      continue;
    }

    const sum = entry.parents.reduce((acc, p) => ({ lat: acc.lat + p.lat, lon: acc.lon + p.lon }), {
      lat: 0,
      lon: 0,
    });
    const centroidLat = sum.lat / entry.parents.length;
    const centroidLon = sum.lon / entry.parents.length;

    const maxDistKm = Math.max(
      ...entry.parents.map((p) => calculateDistance(p.lat, p.lon, centroidLat, centroidLon))
    );

    if (maxDistKm <= PARENT_MERGE_THRESHOLD_KM) {
      groups.push({
        children: entry.children,
        label: entry.parents[0].name,
        lat: centroidLat,
        lon: centroidLon,
      });
    } else {
      for (const p of entry.parents) {
        const pChildren = entry.children.filter((c) => c.parentStation === p.id);
        if (pChildren.length > 0) {
          groups.push({ children: pChildren, label: p.name, lat: p.lat, lon: p.lon });
        }
      }
    }
  }

  return groups;
}
