// Light-mode palettes per transport type (route_type: 0 = tram, 2 = rail, 3 = bus)
const LIGHT_PALETTES: Record<string, string[]> = {
  bus: ['#d97706', '#b45309', '#f59e0b'], // ambers
  mixed: ['#475569', '#334155', '#64748b'], // slates (neutral)
  rail: ['#dc2626', '#b91c1c', '#ef4444'], // reds
  tram: ['#2563eb', '#1d4ed8', '#3b82f6'], // blues
};

// Dark-mode palettes: same hue families, shifted to deep "ink" shades so
// markers read as dark chips (paired with a black border) that sit calmly on
// the dark basemap instead of glowing like they would on a light map.
const DARK_PALETTES: Record<string, string[]> = {
  bus: ['#78350f', '#451a03', '#92400e'], // ambers
  mixed: ['#0f172a', '#020617', '#1e293b'], // slates (neutral)
  rail: ['#7f1d1d', '#450a0a', '#991b1b'], // reds
  tram: ['#1e3a8a', '#172554', '#1e40af'], // blues
};

export function getDirectionColor(
  routeType: null | number,
  index: number,
  isDark: boolean = false
): string {
  let key = 'mixed';
  if (routeType === 0) key = 'tram';
  else if (routeType === 2) key = 'rail';
  else if (routeType === 3) key = 'bus';

  const palettes = isDark ? DARK_PALETTES : LIGHT_PALETTES;
  const pal = palettes[key] || palettes['mixed'];
  return pal[index % pal.length];
}
