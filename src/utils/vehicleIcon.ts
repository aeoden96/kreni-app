/**
 * Leaflet DivIcon factory for vehicle markers.
 *
 * All vehicles are displayed as a filled circle with the route short name inside.
 * When bearing is known a small triangular directional pin is added just outside
 * the circle, pointing in the direction of travel.
 */
import L from 'leaflet';

// Utility: darken a hex color by a fraction (0-1). Returns #rrggbb.
function darkenHex(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const parse = (s: string) => parseInt(s, 16);
  let r: number, g: number, b: number;
  if (h.length === 3) {
    r = parse(h[0] + h[0]);
    g = parse(h[1] + h[1]);
    b = parse(h[2] + h[2]);
  } else {
    r = parse(h.substring(0, 2));
    g = parse(h.substring(2, 4));
    b = parse(h.substring(4, 6));
  }
  const lerp = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - amount))));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(lerp(r))}${toHex(lerp(g))}${toHex(lerp(b))}`;
}

/**
 * Build a Leaflet DivIcon for a vehicle marker.
 *
 * @param color      - Fill colour (hex) for the icon
 * @param bearing    - Degrees clockwise from North; undefined → no directional pin
 * @param isRealtime - Live vs scheduled (kept for API compatibility; stroke matches stops)
 * @param label      - Route short name shown inside the circle
 */
export function makeVehicleIcon(
  color: string,
  bearing: number | undefined,
  _isRealtime: boolean,
  label: string = '',
  darkBackground: boolean = false,
  opacity: number = 1,
): L.DivIcon {
  const dark = darkBackground;
  // Match platform stop markers (StopMarkers): white ring + drop shadow
  const stroke = 'white';
  const strokeW = 2.5;
  const outerRingFill = dark ? 'rgba(255,255,255,0.04)' : 'transparent';
  const fillColor = dark ? darkenHex(color, 0.36) : color;
  const len = label.length;
  const fontSize = len <= 1 ? 13 : len === 2 ? 11 : len === 3 ? 9 : 8;

  if (bearing !== undefined) {
    // Moving vehicle: circle with label + small directional pin.
    // The pin is a triangle sitting just outside the circle, pointing up in SVG
    // space (i.e. towards bearing after the rotation layer spins it).
    //
    // Layout (42×42 px, centre at 21,21):
    //   circle r=13, pin tip at (21,3), pin base at (17,8)–(25,8)
    const size = 42;
    const cx = size / 2; // 21
    const r = 13;
    const pinTipY   = cx - r - 5;      // 3
    const pinBaseY  = cx - r;           // 8
    const pinHalfW  = 4;

    const rotatingSvg =
      `<svg style="position:absolute;top:0;left:0;` +
      `transform:rotate(${bearing}deg);transform-origin:${cx}px ${cx}px;overflow:visible;"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
        `<polygon points="${cx},${pinTipY} ${cx - pinHalfW},${pinBaseY} ${cx + pinHalfW},${pinBaseY}"` +
           ` fill="${fillColor}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>` +
      `</svg>`;

    let fixedSvg =
      `<svg style="position:absolute;top:0;left:0;overflow:visible;"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    if (dark) {
      fixedSvg += `<circle cx="${cx}" cy="${cx}" r="${r + 4}" fill="${outerRingFill}"/>`;
    }
    fixedSvg += `<circle cx="${cx}" cy="${cx}" r="${r}"` +
          ` fill="${fillColor}" fill-opacity="${dark ? 1 : 0.95}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
                `<text x="${cx}" y="${cx + Math.round(fontSize * 0.38)}"` +
                ` text-anchor="middle" font-size="${fontSize}" font-weight="bold"` +
                ` fill="white" font-family="system-ui,sans-serif">${label}</text>` +
      `</svg>`;

    const html =
      `<div data-testid="vehicle-marker" style="position:relative;width:${size}px;height:${size}px;opacity:${opacity};` +
      `filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3));">` +
      rotatingSvg +
      fixedSvg +
      `</div>`;

    return L.divIcon({
      html,
      className: '',
      iconSize: [size, size],
      iconAnchor: [cx, cx],
      tooltipAnchor: [0, -cx],
    });
  }

  // Stationary vehicle: plain circle with label, no pin.
  const size = 34;
  const cx = size / 2; // 17
  const r = 12;

  let svgBody = '';
  if (dark) {
    svgBody += `<circle cx="${cx}" cy="${cx}" r="${r + 3}" fill="${outerRingFill}"/>`;
  }
  svgBody += `<circle cx="${cx}" cy="${cx}" r="${r}"` +
             ` fill="${fillColor}" fill-opacity="${dark ? 1 : 0.85}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
             `<text x="${cx}" y="${cx + Math.round(fontSize * 0.38)}"` +
             ` text-anchor="middle" font-size="${fontSize}" font-weight="bold"` +
             ` fill="white" font-family="system-ui,sans-serif">${label}</text>`;

  const html =
    `<svg data-testid="vehicle-marker" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"` +
    ` style="opacity:${opacity};filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));overflow:visible;">` +
    svgBody +
    `</svg>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [size, size],
    iconAnchor: [cx, cx],
    tooltipAnchor: [0, -cx],
  });
}
