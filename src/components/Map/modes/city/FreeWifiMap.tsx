import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { Wifi } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface FreeWifiMapProps {
  show: boolean;
}

export const FreeWifiMap = memo(function FreeWifiMap({ show }: FreeWifiMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    const url = `${import.meta.env.BASE_URL}static_data/besplatna_wifi_mreza.json`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((data) => setGeoData(data))
      .catch((err) => console.error('Failed to load free wifi:', err));
  }, [show, geoData]);

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
    const valid = geoData.features.filter((feature) => {
      const coords = (feature.geometry as Point).coordinates;
      return coords && coords.length >= 2;
    });
    return annotateCityClusterFeatures(valid, 'wifi');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'wifi',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const wifiIconHtml = renderToString(<Wifi className="w-4 h-4 text-white" />);

  const icon = L.divIcon({
    className: 'free-wifi-icon',
    html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 border-2 border-white shadow-lg">
                ${wifiIconHtml}
            </div>
        `,
    iconAnchor: [12, 12],
    iconSize: [24, 24],
  });

  return (
    <>
      {visibleFeatures.map((feature, i) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = feature.properties ?? {};
        const titleStr = 'Besplatna WiFi mreža';
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={firstStringProp(p, ['lokacija', 'Lokacija'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="wifi"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              offset={[0, -12]}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
