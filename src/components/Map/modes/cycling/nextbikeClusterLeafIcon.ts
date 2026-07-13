import L from 'leaflet';

import { firstNumberProp } from '../../../../utils/geojsonPropertyPick';
import { NEXTBIKE_BRAND_HEX } from '../../../../utils/nextbikeAppLinks';

/** Leaf marker for merged cluster layer (dynamic count / availability / favourite ring). */
export function getNextbikeClusterLeafIcon(properties: Record<string, unknown>): L.DivIcon {
  const bikes = firstNumberProp(properties, ['bikes']) ?? 0;
  const isAvailable = bikes > 0;
  const isFav = properties._isFavourite === true;
  const favRing = isFav ? 'box-shadow: 0 0 0 2px #fbbf24, 0 2px 6px rgba(0,0,0,0.25);' : '';
  const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full shadow-md text-white font-bold text-[10px] transition-all"
               style="background-color: ${isAvailable ? NEXTBIKE_BRAND_HEX : '#94a3b8'}; border: 2px solid white; ${favRing}">
            ${bikes}
          </div>
        `;

  return L.divIcon({
    className: 'bajs-station-icon city-cluster-leaf--nextbikeStations',
    html: iconHtml,
    iconAnchor: [12, 12],
    iconSize: [24, 24],
  });
}
