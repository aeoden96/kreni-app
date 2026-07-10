/**
 * Leaflet DivIcon factory for vehicle markers.
 *
 * All vehicles are displayed as a filled circle with the route short name inside.
 * When bearing is known a small triangular directional pin is added just outside
 * the circle, pointing in the direction of travel.
 */
import L from 'leaflet';

import { buildDirectionalStopPinPathData } from './stopMarkersMath';

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
  opacity: number = 1
): L.DivIcon {
  const dark = darkBackground;
  // Match platform stop markers (StopMarkers): white ring on light maps,
  // black ring on dark maps (paired with the deep "ink" dark-mode fill colors).
  const stroke = dark ? '#000000' : 'white';
  const strokeW = 2.5;
  const outerRingFill = dark ? 'rgba(255,255,255,0.04)' : 'transparent';
  // `color` is already the theme-appropriate hue (see getDirectionColor's dark
  // palette) — no further darkening here, since that would just reduce contrast
  // against the near-black dark basemap.
  const fillColor = color;
  const len = label.length;
  const fontSize = len <= 1 ? 16 : len === 2 ? 14 : len === 3 ? 11 : 9;

  if (bearing !== undefined) {
    // Moving vehicle: droplet-style pin pointing in the direction of travel.
    // The tip of the droplet acts as the directional indicator.
    const size = 46; // Make it slightly bigger as requested
    const cx = size / 2;
    const pathData = buildDirectionalStopPinPathData(cx);

    const rotatingSvg =
      `<svg style="position:absolute;top:0;left:0;` +
      `transform:rotate(${bearing}deg);transform-origin:${cx}px ${cx}px;overflow:visible;"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
      `<path d="${pathData}" fill="${fillColor}" fill-opacity="${dark ? 1 : 0.95}" stroke="${stroke}" stroke-width="${strokeW}" stroke-linejoin="round"/>` +
      `</svg>`;

    let fixedSvg =
      `<svg style="position:absolute;top:0;left:0;overflow:visible;"` +
      ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
    if (dark) {
      // Add a soft circular glow behind the droplet body in dark mode
      fixedSvg += `<circle cx="${cx}" cy="${cx}" r="${cx * 0.75}" fill="${outerRingFill}"/>`;
    }
    fixedSvg +=
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
      className: '',
      html,
      iconAnchor: [cx, cx], // center it perfectly at the droplet head
      iconSize: [size, size],
      tooltipAnchor: [0, -cx],
    });
  }

  // Stationary vehicle: plain circle with label, no pin.
  const size = 38; // Increased slightly to maintain proportion with the bigger droplet
  const cx = size / 2; // 19
  const r = 14;

  let svgBody = '';
  if (dark) {
    svgBody += `<circle cx="${cx}" cy="${cx}" r="${r + 3}" fill="${outerRingFill}"/>`;
  }
  svgBody +=
    `<circle cx="${cx}" cy="${cx}" r="${r}"` +
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
    className: '',
    html,
    iconAnchor: [cx, cx],
    iconSize: [size, size],
    tooltipAnchor: [0, -cx],
  });
}
