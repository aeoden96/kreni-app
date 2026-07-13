import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface StudentRestaurantsMapProps {
  show: boolean;
}

export const StudentRestaurantsMap = memo(function StudentRestaurantsMap({
  show,
}: StudentRestaurantsMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    const url = `${import.meta.env.BASE_URL}static_data/studentski_restorani.json`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((data) => setGeoData(data))
      .catch((err) => console.error('Failed to load student restaurants:', err));
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
    return annotateCityClusterFeatures(valid, 'restaurants');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'restaurants',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'student-restaurant-icon',
    html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg text-white">
                🍴
            </div>
        `,
    iconAnchor: [16, 16],
    iconSize: [32, 32],
  });

  return (
    <>
      {visibleFeatures.map((feature, i) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = feature.properties ?? {};
        const web = firstStringProp(p, ['web', 'Web']);
        const titleStr = firstStringProp(p, ['naziv', 'NAZIV']) || 'Studentski restoran';
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={firstStringProp(p, ['adresa', 'ADRESA'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="restaurants"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Web: web,
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
