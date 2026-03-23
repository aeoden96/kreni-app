/**
 * Spiderfier context – detects overlapping Leaflet markers and fans them out.
 * Zero external dependencies: pure React + Leaflet maths.
 */
/* eslint-disable react-refresh/only-export-components */

import L from 'leaflet';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

// ── Public types ─────────────────────────────────────────────────────────────

interface SpiderfiedGroup {
  centerLat: number;
  centerLon: number;
  items: SpiderfiedItem[];
}

interface SpiderfiedItem {
  /** When true, the text label bubble is hidden in the spider fan (icon is sufficient). */
  hideLabel?: boolean;
  icon?: L.DivIcon | null;
  id: string;
  /** Initial label (stop name). Never mutated — enrichment happens inside SpiderNode. */
  label: string;
  onClick: () => void;
  originalLat: number;
  originalLon: number;
  /** Optional: resolve an enriched label (e.g. with route badges) asynchronously. */
  resolveLabel?: () => Promise<string>;
  spiderfiedLat: number;
  spiderfiedLon: number;
}

interface SpiderfierCtx {
  collapse: () => void;
  /** Returns true when the marker with this id should hide (it's shown in fan). */
  isHidden: (id: string) => boolean;
  register: (entry: SpiderfierEntry) => void;
  spiderfied: null | SpiderfiedGroup;
  /**
   * Call from a marker's click handler instead of the original onClick.
   * If no overlap is detected the original onClick fires; otherwise
   * the group is spiderfied (or collapsed if already open).
   */
  triggerSpiderfy: (id: string, map: L.Map) => void;
  unregister: (id: string) => void;
}

interface SpiderfierEntry {
  /** Called fresh each time the spider fan is rendered to get the current icon. */
  getIcon?: () => L.DivIcon | null;
  /** When true, the text label bubble is hidden in the spider fan (icon is sufficient). */
  hideLabel?: boolean;
  id: string;
  /** Shown in the list-fallback popup and as tooltip on node markers. */
  label: string;
  lat: number;
  lon: number;
  onClick: () => void;
  /** Optional: Resolve a more descriptive label on-demand (e.g. including route info). */
  resolveLabel?: () => Promise<string>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const SpiderfierContext = createContext<null | SpiderfierCtx>(null);

export function useSpiderfierContext(): null | SpiderfierCtx {
  return useContext(SpiderfierContext);
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Within this many pixels markers are treated as overlapping. */
const OVERLAP_PX = 22;

/** Fan to radial layout; beyond this count zoom in the map instead. */
const MAX_SPIDER_FAN = 5;

// ── Layout helpers ────────────────────────────────────────────────────────────

export function SpiderfierProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<Map<string, SpiderfierEntry>>(new Map());
  const [spiderfied, setSpiderfied] = useState<null | SpiderfiedGroup>(null);
  // Ref so isHidden reads the latest set without causing extra renders
  const spiderfiedIdsRef = useRef<Set<string>>(new Set());
  // Tracks any in-flight moveend handler so a subsequent click can cancel it
  const pendingPanRef = useRef<null | { handler: () => void; map: L.Map }>(null);

  const register = useCallback((entry: SpiderfierEntry) => {
    registryRef.current.set(entry.id, entry);
  }, []);

  const unregister = useCallback((id: string) => {
    registryRef.current.delete(id);
  }, []);

  const collapse = useCallback(() => {
    if (pendingPanRef.current) {
      pendingPanRef.current.map.off('moveend', pendingPanRef.current.handler);
      pendingPanRef.current = null;
    }
    spiderfiedIdsRef.current = new Set();
    setSpiderfied(null);
  }, []);

  const triggerSpiderfy = useCallback(
    (id: string, map: L.Map) => {
      const registry = registryRef.current;
      const clicked = registry.get(id);
      if (!clicked) return;

      if (spiderfiedIdsRef.current.has(id)) {
        collapse();
        return;
      }
      collapse(); // also cancels any in-flight pan via updated collapse

      const clickedPx = map.latLngToContainerPoint([clicked.lat, clicked.lon]);

      // Gather overlap based on current pixel positions — BEFORE panning,
      // so coordinates are still accurate to what the user tapped.
      const nearby: SpiderfierEntry[] = [];
      registry.forEach((entry) => {
        const px = map.latLngToContainerPoint([entry.lat, entry.lon]);
        const dx = px.x - clickedPx.x;
        const dy = px.y - clickedPx.y;
        if (Math.sqrt(dx * dx + dy * dy) <= OVERLAP_PX) {
          nearby.push(entry);
        }
      });

      // Executed after the pan animation settles — keeps UI renders off the
      // critical path of the map animation so there's no jitter.
      const executeAction = () => {
        pendingPanRef.current = null;

        if (nearby.length <= 1) {
          clicked.onClick();
          return;
        }

        // Large cluster – zoom in instead of spiderfying
        if (nearby.length > MAX_SPIDER_FAN) {
          const targetZoom = map.getZoom() + 1;
          const offsetPx =
            typeof window !== 'undefined' && window.innerWidth < 640
              ? -Math.round(window.innerHeight / 4)
              : 0;
          if (offsetPx !== 0) {
            const pt = map.project([clicked.lat, clicked.lon] as [number, number], targetZoom);
            const adjusted = map.unproject(L.point(pt.x, pt.y + offsetPx), targetZoom);
            map.setView(adjusted, targetZoom);
          } else {
            map.setView([clicked.lat, clicked.lon], targetZoom);
          }
          return;
        }

        // Spider fan — recalculate pixel positions using the post-pan center
        const newClickedPx = map.latLngToContainerPoint([clicked.lat, clicked.lon]);
        const positions = circlePositions(nearby.length, newClickedPx, map);

        const items: SpiderfiedItem[] = nearby.map((entry, i) => ({
          hideLabel: entry.hideLabel,
          icon: entry.getIcon?.() ?? null,
          id: entry.id,
          label: entry.label,
          onClick: () => {
            collapse();
            entry.onClick();
          },
          originalLat: entry.lat,
          originalLon: entry.lon,
          // Pass resolveLabel through so SpiderNode enriches its own DOM directly,
          // avoiding a setSpiderfied call that would re-render all nodes and
          // replay the pop-in animation for every item in the fan.
          resolveLabel: entry.resolveLabel,
          spiderfiedLat: positions[i].lat,
          spiderfiedLon: positions[i].lng,
        }));

        spiderfiedIdsRef.current = new Set(nearby.map((e) => e.id));
        const group: SpiderfiedGroup = { centerLat: clicked.lat, centerLon: clicked.lon, items };
        setSpiderfied(group);
      };

      // Pan first; defer all UI work until the map has settled.
      // If the map is already centered on the target (< 2px away), fire immediately
      // because Leaflet won't emit moveend for a zero-distance pan.
      const target = getOffsetTarget(map, clicked.lat, clicked.lon);
      const distPx = map
        .latLngToContainerPoint(map.getCenter())
        .distanceTo(map.latLngToContainerPoint(target));

      if (distPx < 2) {
        map.panTo(target);
        executeAction();
      } else {
        pendingPanRef.current = { handler: executeAction, map };
        map.once('moveend', executeAction);
        map.panTo(target);
      }
    },
    [collapse]
  );

  const isHidden = useCallback((id: string) => spiderfiedIdsRef.current.has(id), []);

  const value = useMemo<SpiderfierCtx>(
    () => ({ collapse, isHidden, register, spiderfied, triggerSpiderfy, unregister }),
    [register, unregister, triggerSpiderfy, collapse, spiderfied, isHidden]
  );

  return <SpiderfierContext.Provider value={value}>{children}</SpiderfierContext.Provider>;
}

function circlePositions(count: number, center: L.Point, map: L.Map): L.LatLng[] {
  const radius = count <= 3 ? 40 : count <= 6 ? 55 : 70;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return map.containerPointToLatLng(
      L.point(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle))
    );
  });
}

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Compute the pan target for [lat, lon], shifting downward on mobile so the
 * selected stop marker ends up in the lower half of the viewport — below the
 * StopInfoBar that appears at the top of the screen.
 */
function getOffsetTarget(map: L.Map, lat: number, lon: number): L.LatLng {
  const offsetPx =
    typeof window !== 'undefined' && window.innerWidth < 640
      ? -Math.round(window.innerHeight / 4)
      : 0;
  if (offsetPx !== 0) {
    const zoom = map.getZoom();
    const pt = map.project([lat, lon] as [number, number], zoom);
    return map.unproject(L.point(pt.x, pt.y + offsetPx), zoom);
  }
  return L.latLng(lat, lon);
}
