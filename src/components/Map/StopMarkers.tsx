/**
 * Render stop markers on the map
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Marker, Polyline, useMap } from 'react-leaflet';
import { useSpiderfierContext } from './SpiderfierContext';
import L from 'leaflet';
import { fetchStopTimetable, type Stop, type Route } from '../../utils/gtfs';
import { getDirectionColor } from './directionColors';

// ── Stop colour by service type ──────────────────────────────────────────────
function stopFillColor(stop: Stop, isSelected: boolean, isHighlighted: boolean): string {
  if (isHighlighted && !isSelected) return '#2337ff';
  switch (stop.routeType) {
    case 0: return '#2563eb';  // tram-only  → blue
    case 3: return '#d97706';  // bus-only   → amber
    case 2: return '#dc2626';  // rail       → red
    default: return '#475569'; // fallback    → slate
  }
}

/**
 * Build a DivIcon for a platform stop marker.
 * When `bearing` is supplied a small directional triangle is rendered
 * just outside the circle, pointing in the direction of travel.
 */
function makeStopIcon(
  color: string,
  bearing: number | undefined,
  size: number,
  r: number,
  opacityFactor: number,
  isSelected: boolean,
  label?: string
): L.DivIcon {
  const cx = size / 2;
  const safeLabel = label
    ? String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : '';

  const extraClass = isSelected ? 'stop-selected-pulse' : '';

  if (bearing !== undefined) {
    // --- UNIFIED ROUNDY ARROW PIN DESIGN ---
    // Instead of two shapes, we use a single path to create a clean "shield" or "pin" silhouette
    // and eliminate the "circle inside arrow" visual artifact.
    const tipY = 0;
    // Calculate tangent points on the circle to create a smooth transition to the arrow tip
    const angleRad = (42 * Math.PI) / 180; // 42 degrees from vertical
    const xOff = r * Math.sin(angleRad);
    const yOff = r * Math.cos(angleRad);

    const x1 = cx - xOff;
    const y1 = cx - yOff;
    const x2 = cx + xOff;
    const y2 = cx - yOff;

    const pathData = `M ${cx},${tipY} L ${x1},${y1} A ${r},${r} 0 1 0 ${x2},${y2} Z`;

    const html =
      `<div data-testid="stop-marker" class="${extraClass}" style="position:relative;width:${size}px;height:${size}px;opacity:${opacityFactor};">` +
      `<svg style="position:absolute;top:0;left:0;transform:rotate(${bearing}deg);transform-origin:${cx}px ${cx}px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));overflow:visible;"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      // The Unified Silhouette
      `<path d="${pathData}" fill="${color}" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>` +
      `</svg>` +
      `${safeLabel ? `<span class="stop-label">${safeLabel}</span>` : ''}` +
      `</div>`;
    return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [cx, cx] });
  }

  const html =
    `<div data-testid="stop-marker" class="${extraClass}" style="position:relative;width:${size}px;height:${size}px;">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"` +
    ` style="opacity:${opacityFactor};filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));overflow:visible;">` +
    `<circle cx="${cx}" cy="${cx}" r="${r}" fill="${color}" fill-opacity="0.95" stroke="white" stroke-width="2.5"/>` +
    `</svg>` +
    `${safeLabel ? `<span class="stop-label">${safeLabel}</span>` : ''}` +
    `</div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [cx, cx] });
}

// ── Platform stop sub-component (registers with spiderfier) ────────────────

interface PlatformStopMarkerProps {
  stop: Stop;
  isSelected: boolean;
  isHighlighted: boolean;
  color: string;
  effectiveFactor: number;
  routesById: Map<string, Route>;
  onStopClick: (id: string) => void;
}

function PlatformStopMarker({
  stop,
  isSelected,
  isHighlighted,
  color,
  effectiveFactor,
  routesById,
  onStopClick,
}: PlatformStopMarkerProps) {
  const map = useMap();
  const ctx = useSpiderfierContext();

  // Compute icon before hooks/effects so iconRef always holds the latest value
  // Standard is 32/6, so selected is doubled to 64/12.
  const size = isSelected ? 64 : isHighlighted ? 38 : 32;
  const r = isSelected ? 12 : isHighlighted ? 7.5 : 6;
  const icon = useMemo(
    () => makeStopIcon(color, stop.bearing, size, r, effectiveFactor, isSelected, undefined),
    [color, stop.bearing, size, r, effectiveFactor, isSelected]
  );
  const iconRef = useRef(icon);
  useLayoutEffect(() => { iconRef.current = icon; }, [icon]);

  useEffect(() => {
    if (!ctx) return;

    // Resolve a more descriptive label on-demand (e.g. including route info)
    const resolveLabel = async () => {
      try {
        const timetable = await fetchStopTimetable(stop.id);
        const routes = Object.keys(timetable)
          .map(rid => routesById.get(rid))
          .filter((r): r is Route => !!r)
          .sort((a, b) => {
            const numA = parseInt(a.shortName, 10);
            const numB = parseInt(b.shortName, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.shortName.localeCompare(b.shortName);
          });

        if (routes.length === 0) return stop.name;

        const renderedBadges = routes.map(r => {
          const typeClass = r.type === 0 ? 'is-tram' : r.type === 3 ? 'is-bus' : 'is-mixed';
          return `<span class="spider-route-badge ${typeClass}">${r.shortName}</span>`;
        }).join('');

        // Estimate total badge row width to decide whether to animate or not.
        // Badge: font-size 10px bold ≈ 6.5px/char, 10px h-padding, min-width 18px, gap 3px.
        // Visible ticker area ≈ 110px (130px container minus mask fade zones).
        const CHAR_PX = 6.5;
        const H_PAD = 10;
        const MIN_W = 18;
        const GAP = 3;
        const TICKER_VISIBLE_PX = 110;
        const estimatedWidth = routes.reduce(
          (sum, r, i) => sum + Math.max(MIN_W, r.shortName.length * CHAR_PX + H_PAD) + (i > 0 ? GAP : 0),
          0,
        );

        const badgeContent = estimatedWidth <= TICKER_VISIBLE_PX
          // Fits — plain static row, no animation, no mask, no duplication
          ? `<div class="spider-route-badges">${renderedBadges}</div>`
          // Overflows — scrolling ticker with seamless doubled content
          : `<div class="spider-route-ticker"><div class="spider-route-ticker-inner">${renderedBadges}${renderedBadges}</div></div>`;

        return `<div class="spider-label-content"><span class="stop-name">${stop.name}</span>${badgeContent}</div>`;
      } catch (err) {
        console.error('Failed to resolve routes for stop', stop.id, err);
        return stop.name;
      }
    };

    ctx.register({
      id: stop.id,
      lat: stop.lat,
      lon: stop.lon,
      label: stop.name,
      resolveLabel,
      onClick: () => onStopClick(stop.id),
      getIcon: () => iconRef.current,
    });
    return () => ctx.unregister(stop.id);
  }, [stop.id, stop.lat, stop.lon, stop.name, onStopClick, ctx, routesById]);

  // Hide when the SpiderfierManager is rendering this marker in the fan
  if (ctx?.isHidden(stop.id)) return null;

  return (
    <Marker
      position={[stop.lat, stop.lon]}
      icon={icon}
      zIndexOffset={isSelected ? 10000 : isHighlighted ? 500 : 0}
      eventHandlers={{
        click: (e) => {
          e.originalEvent.stopPropagation();
          if (ctx) {
            ctx.triggerSpiderfy(stop.id, map);
          } else {
            onStopClick(stop.id);
          }
        },
      }}
    />
  );
}

interface StopMarkersProps {
  stops: Stop[];
  isParentStationView: boolean;
  parentChildCounts: Map<string, number>; // platform-counts per parent station id
  /** Optional parent station list (used when individual mode wants parent labels/lines) */
  parentStations?: Stop[];
  selectedStopId: string | null;
  highlightStopIds: string[];
  /** Optional mapping stopId -> direction index (0,1,...) for highlighted stops */
  stopDirectionMap?: Record<string, number>;
  onStopClick: (stopId: string) => void;
  /** 0-1 factor applied to all marker opacity (individual mode zoom fading). Selected stops always stay at 1. */
  opacityFactor?: number;
  /** When true, platform stop labels are rendered inside the DivIcon (used at max zoom) */
  showLabels?: boolean;
  routesById: Map<string, Route>;
}

export function StopMarkers({
  stops,
  isParentStationView,
  parentStations,
  parentChildCounts,
  selectedStopId,
  highlightStopIds,
  stopDirectionMap,
  onStopClick,
  opacityFactor = 1,
  showLabels = false,
  routesById,
}: StopMarkersProps) {
  const highlightSet = new Set(highlightStopIds as string[]);

  // Build a lookup of parent stations by id for quick access
  const parentMap = new Map<string, Stop>();
  if (parentStations) parentStations.forEach((p) => parentMap.set(p.id, p));

  // When showing labels at parent locations, compute grouped parent labels by name.
  // If multiple parent stations share the same name and are within a small distance,
  // show a single label at the centroid and connect it to all child platform stops.
  type ParentLabelGroup = { label: string; lat: number; lon: number; children: Stop[] };
  const parentLabelGroups: ParentLabelGroup[] = [];
  if (showLabels && parentStations) {
    const platformStops = stops.filter((s) => s.locationType === 0);
    const childrenByParent = new Map<string, Stop[]>();
    platformStops.forEach((st) => {
      if (st.parentStation) {
        const arr = childrenByParent.get(st.parentStation) || [];
        arr.push(st);
        childrenByParent.set(st.parentStation, arr);
      }
    });

    // Group parents by normalized name
    const nameGroups = new Map<string, { parents: Stop[]; children: Stop[] }>();
    childrenByParent.forEach((children, pid) => {
      const parent = parentMap.get(pid);
      if (!parent || children.length === 0) return;
      const key = parent.name.trim().toLowerCase();
      const entry = nameGroups.get(key) || { parents: [], children: [] };
      entry.parents.push(parent);
      entry.children.push(...children);
      nameGroups.set(key, entry);
    });

    // Haversine distance helper (meters)
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (deg: number) => deg * Math.PI / 180;
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const MERGE_THRESHOLD_METERS = 60; // parents within this distance will share a label
    nameGroups.forEach((entry, _key) => {
      if (entry.parents.length === 1) {
        const p = entry.parents[0];
        parentLabelGroups.push({ label: p.name, lat: p.lat, lon: p.lon, children: entry.children });
        return;
      }

      // compute centroid of parent positions
      const sum = entry.parents.reduce((acc, p) => ({ lat: acc.lat + p.lat, lon: acc.lon + p.lon }), { lat: 0, lon: 0 });
      const centroidLat = sum.lat / entry.parents.length;
      const centroidLon = sum.lon / entry.parents.length;

      // check spatial spread — if parents are far apart, don't merge; render separate labels instead
      const maxDist = Math.max(...entry.parents.map((p) => haversine(p.lat, p.lon, centroidLat, centroidLon)));
      if (maxDist <= MERGE_THRESHOLD_METERS) {
        parentLabelGroups.push({ label: entry.parents[0].name, lat: centroidLat, lon: centroidLon, children: entry.children });
      } else {
        // keep separate labels for each parent
        entry.parents.forEach((p) => {
          const pChildren = entry.children.filter((c) => c.parentStation === p.id);
          if (pChildren.length > 0) parentLabelGroups.push({ label: p.name, lat: p.lat, lon: p.lon, children: pChildren });
        });
      }
    });
  }
  return (
    <>
      {stops.map((s) => {
        const stop = s as Stop;
        const id = stop.id;

        const isSelected = id === selectedStopId;
        const isHighlighted = highlightSet.has(id);

        // Render parent stations when in parent-station view
        if (isParentStationView && stop.locationType === 1) {
          const childCount = parentChildCounts.get(stop.id) || 0;
          const displayCount = childCount > 9 ? '9+' : childCount.toString();

          const icon = L.divIcon({
            html: `<div data-testid="stop-marker" class="parent-station-marker ${isSelected ? 'selected stop-selected-pulse' : ''} ${isHighlighted ? 'highlighted' : ''}">
              <span class="count">${displayCount}</span>
            </div>`,
            className: 'parent-station-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          return (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lon]}
              icon={icon}
              eventHandlers={{
                click: () => onStopClick(stop.id)
              }}
            />
          );
        }

        // Render regular platform stops
        // Selected stops always remain fully visible regardless of opacityFactor
        const effectiveFactor = isSelected ? 1 : opacityFactor;
        // Skip rendering when fully transparent (perf optimisation)
        if (effectiveFactor === 0) return null;

        // If highlighted and a direction map is available, use the direction color
        let color = stopFillColor(stop, isSelected, isHighlighted);
        if (isHighlighted && stopDirectionMap && stopDirectionMap[id] !== undefined) {
          const dirIdx = stopDirectionMap[id];
          color = getDirectionColor(stop.routeType ?? null, dirIdx);
        }
        return (
          <PlatformStopMarker
            key={stop.id}
            stop={stop}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            color={color}
            effectiveFactor={effectiveFactor}
            routesById={routesById}
            onStopClick={onStopClick}
          />
        );
      })}
      {/* Render parent labels and connector lines when requested (individual-mode enhancement) */}
      {showLabels && parentLabelGroups.map(({ label, lat, lon, children }, idx) => (
        <span key={`parent-label-${idx}`}>
          <Marker
            position={[lat, lon]}
            icon={L.divIcon({
              html: `<span class="parent-station-label">${String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`,
              className: '',
              iconSize: [0, 0],
              iconAnchor: [0, 0],
            })}
            interactive={false}
          />
          {children.map((c) => (
            <Polyline
              key={`line-${idx}-${c.id}`}
              positions={[[lat, lon], [c.lat, c.lon]]}
              pathOptions={{ color: '#9ca3af', weight: 0.8, opacity: 0.45, dashArray: '3 4' }}
            />
          ))}
        </span>
      ))}
    </>
  );
}
