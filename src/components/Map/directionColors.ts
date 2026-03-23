export function getDirectionColor(routeType: null | number, index: number): string {
  // Color palettes per transport type
  const palettes: Record<string, string[]> = {
    bus: ['#d97706', '#b45309', '#f59e0b'], // ambers
    mixed: ['#475569', '#334155', '#64748b'], // slates (neutral)
    rail: ['#dc2626', '#b91c1c', '#ef4444'], // reds
    tram: ['#2563eb', '#1d4ed8', '#3b82f6'], // blues
  };

  let key = 'mixed';
  if (routeType === 0) key = 'tram';
  else if (routeType === 2) key = 'rail';
  else if (routeType === 3) key = 'bus';

  const pal = palettes[key] || palettes['mixed'];
  return pal[index % pal.length];
}
