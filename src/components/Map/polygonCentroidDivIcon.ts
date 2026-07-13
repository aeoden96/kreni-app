import L from 'leaflet';

const DEFAULT_SIZE: [number, number] = [28, 28];
const DEFAULT_ANCHOR: [number, number] = [14, 14];

export function createPolygonCentroidDivIcon(options: {
  className: string;
  html: string;
  iconAnchor?: [number, number];
  iconSize?: [number, number];
}): L.DivIcon {
  return L.divIcon({
    className: options.className,
    html: options.html,
    iconAnchor: options.iconAnchor ?? DEFAULT_ANCHOR,
    iconSize: options.iconSize ?? DEFAULT_SIZE,
  });
}

/** Circular badge HTML for a centroid marker (Tailwind; matches cluster leaf styling). */
export function polygonCentroidBadgeHtml(options: {
  bgClass: string;
  emoji: string;
  sizeClass?: string;
  textSizeClass?: string;
}): string {
  const sizeClass = options.sizeClass ?? 'w-7 h-7';
  const textSizeClass = options.textSizeClass ?? 'text-[15px]';
  return `<div class="flex items-center justify-center ${sizeClass} rounded-full ${options.bgClass} border-2 border-white shadow-lg ${textSizeClass}">${options.emoji}</div>`;
}
