import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';

import { STATIC_DATA_URL } from '../../../../config';
import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetchWithTTL } from '../../../../stores/dataCache';
import { parseGalleriesCsv } from '../../../../utils/csvPointParsers';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

const URL = `${STATIC_DATA_URL}/galleries-csv`;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  show: boolean;
}

export const GalleriesMap = memo(function GalleriesMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    cachedFetchWithTTL(
      URL,
      async () => {
        const response = await fetch(URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch galleries CSV (${response.status})`);
        }

        return parseGalleriesCsv(await response.text());
      },
      ONE_WEEK_MS
    )
      .then((data) => setGeoData(data))
      .catch((error) => console.error('Failed to load galleries:', error));
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
    return annotateCityClusterFeatures(valid, 'galleries');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'galleries',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'galleries-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-fuchsia-600 border-2 border-white shadow-lg text-[15px]">🖼️</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((feature, index) => {
        const coords = (feature.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;

        const p = feature.properties ?? {};
        const pr = p as Record<string, unknown>;
        const titleStr = firstStringProp(pr, ['Name', 'naziv']) || 'Galerija';
        const sourceId = firstStringProp(pr, ['id', 'OBJECTID', 'objectid', 'ObjectID']);

        return (
          <Marker
            icon={icon}
            key={`${p.Name ?? 'gallery'}-${index}`}
            position={[coords[1], coords[0]]}
          >
            <MapTooltip
              description={p.Description}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="galleries"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Email: p['E-mail'],
                Telefon: p.Tel,
                Web: p.Web,
              }}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
