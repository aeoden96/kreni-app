import L from 'leaflet';

/**
 * Bubble icon for the low-zoom vehicle cluster layer.
 *
 * A circle rather than the city layer's pill: these are counts of one thing, so
 * there is no emoji row to make room for, and a disc reads faster at the sizes
 * involved. Mode is carried by the ring colour alone — no glyph — so the disc
 * stays small enough not to crowd the low-zoom map.
 *
 * Every bubble is single-mode by construction — {@link VehicleClusterLayer} runs
 * one cluster tree per vehicle type, so a group of trams and a group of buses in
 * the same area are two separate discs. That keeps the count on each disc a
 * count of one thing, which is the whole point.
 *
 * A dark core carries the count, with the mode colour as a ring around it, so the
 * numerals sit on one constant background instead of shifting legibility between
 * a mid blue and a bright orange. Hues match the individual vehicle icons in
 * {@link makeVehicleIcon}, so the mapping is already learnable from the zoomed-in
 * map.
 */
export type VehicleClusterMode = 'bus' | 'tram';

const MODE_COLOR: Record<VehicleClusterMode, string> = {
  bus: '#ff6b35',
  tram: '#2337ff',
};

/** Ring thickness in px — the mode-coloured band left showing around the dark core. */
const RING = 3;

const iconCache = new Map<string, L.DivIcon>();

export function createVehicleClusterIcon(mode: VehicleClusterMode, count: number): L.DivIcon {
  const cacheKey = `${mode}:${count}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const { font, size } = sizeFor(count);
  const color = MODE_COLOR[mode];
  const label = count >= 1000 ? `${Math.round(count / 100) / 10}k` : String(count);

  // Dark core inside a mode-coloured ring: the outer disc is the colour, the
  // inset child paints over all but `RING` px of it. Cheaper and crisper than a
  // real border, which would fight the box-shadow halo for the same edge.
  const icon = L.divIcon({
    className: 'vehicle-cluster-bubble',
    html: `
      <div
        class="relative flex items-center justify-center rounded-full"
        style="width:${size}px;height:${size}px;background:${color};box-shadow:0 0 0 4px ${hexToRgba(color, 0.22)}, 0 2px 8px rgba(0,0,0,0.35)"
      >
        <div class="absolute rounded-full" style="inset:${RING}px;background:rgba(23,23,23,0.94)"></div>
        <span
          class="relative font-extrabold tabular-nums leading-none text-white"
          style="font-size:${font}px"
        >${label}</span>
      </div>
    `,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size],
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Diameter grows in steps with the count so a big group looks big. Tighter than
 * the glyph-bearing version these replaced — a lone numeral needs no stacked row,
 * and a smaller disc keeps the low-zoom map calmer.
 */
function sizeFor(count: number): { font: number; size: number } {
  if (count < 5) return { font: 11, size: 28 };
  if (count < 20) return { font: 12, size: 33 };
  if (count < 60) return { font: 13, size: 38 };
  return { font: 14, size: 44 };
}
