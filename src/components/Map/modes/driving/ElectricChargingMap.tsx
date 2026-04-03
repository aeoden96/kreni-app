import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { Zap } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { firstNumberProp, firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface ElectricChargingMapProps {
  show: boolean;
}

export const ElectricChargingMap = memo(function ElectricChargingMap({
  show,
}: ElectricChargingMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'driving' });
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

  const visibleFeatures = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    const raw = geoData.features.filter((feature) => {
      const coords = (feature.geometry as Point).coordinates;
      return (
        coords && coords.length >= 2 && geoJsonLngLatInMapBounds(bounds, [coords[0], coords[1]])
      );
    });
    return raw;
  }, [bounds, geoData, shouldRenderDetail]);

  const featuresForCluster = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    const valid = geoData.features.filter((f) => {
      const coords = (f.geometry as Point).coordinates;
      return coords && coords.length >= 2;
    });
    return annotateCityClusterFeatures(valid, 'electricCharging');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'electricCharging',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  return (
    <>
      {visibleFeatures.map((feature) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = feature.properties ?? {};
        const broj = firstNumberProp(p, ['BROJ_UTICNICA', 'broj_uticnica']);
        const tip = firstStringProp(p, ['TIP_UTICNICE', 'tip_uticnice']);
        const naziv = firstStringProp(p, ['NAZIV', 'naziv']);
        const adresa = firstStringProp(p, ['ADRESA', 'adresa']);
        const key = firstStringProp(p, ['OBJECTID_1', 'OBJECTID']) ?? `${coords[0]}-${coords[1]}`;
        const sourceId = firstStringProp(p, ['OBJECTID_1', 'OBJECTID']);
        const titleStr = naziv || 'Punionica';
        return (
          <Marker icon={icon} key={key} position={[coords[1], coords[0]]}>
            <MapTooltip
              className="custom-tooltip shadow-lg"
              description={adresa}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="electricCharging"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                'Broj utičnica': broj !== undefined ? String(broj) : undefined,
                'Tip utičnice': tip,
              }}
              offset={[0, -16]}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
