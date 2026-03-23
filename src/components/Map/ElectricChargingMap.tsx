import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { Zap } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { Marker, Tooltip } from 'react-leaflet';

import { cachedFetch, dataFetch } from '../../stores/dataCache';

interface ElectricChargingMapProps {
  show: boolean;
}

export const ElectricChargingMap = memo(function ElectricChargingMap({
  show,
}: ElectricChargingMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    const url = `${import.meta.env.BASE_URL}static_data/elektricne_punionice.json`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((data) => setGeoData(data))
      .catch((err) => console.error('Failed to load electric charging stations:', err));
  }, [show, geoData]);

  const icon = useMemo(() => {
    const zapIconHtml = renderToString(<Zap className="w-4 h-4 text-white" />);
    return L.divIcon({
      className: 'electric-charging-icon',
      html: `
                <div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg">
                    ${zapIconHtml}
                </div>
            `,
      iconAnchor: [16, 16],
      iconSize: [32, 32],
    });
  }, []);

  if (!show || !geoData) return null;

  return (
    <>
      {geoData.features.map((feature) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const props = feature.properties;
        return (
          <Marker icon={icon} key={props?.OBJECTID_1} position={[coords[1], coords[0]]}>
            <Tooltip className="custom-tooltip shadow-lg !p-3" direction="top" offset={[0, -16]}>
              <div className="text-base font-bold text-base-content mb-1">{props?.NAZIV}</div>
              <div className="text-sm text-base-content/80 mb-2">{props?.ADRESA}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-base-200/50 p-2 rounded-lg">
                {props?.BROJ_UTICNICA !== null && props?.BROJ_UTICNICA !== undefined && (
                  <>
                    <div className="text-base-content/60">Broj utičnica:</div>
                    <div className="font-semibold text-right">{props.BROJ_UTICNICA}</div>
                  </>
                )}
                {props?.TIP_UTICNICE && (
                  <>
                    <div className="text-base-content/60">Tip:</div>
                    <div className="font-semibold text-right">{props.TIP_UTICNICE}</div>
                  </>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
});
