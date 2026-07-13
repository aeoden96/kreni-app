import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticDatasetJson } from '../../../../hooks/useStaticDatasetJson';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface Props {
  show: boolean;
}

export const MarketsMap = memo(function MarketsMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>('markets-trznice.geojson', show, {
    logErrorLabel: 'markets',
  });

  const visibleFeatures = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    const raw = geoData.features.filter((f) => {
      const coords = (f.geometry as Point).coordinates;
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
    return annotateCityClusterFeatures(valid, 'markets');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'markets',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'market-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow-lg text-[15px]">🛒</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const infoLink = firstStringProp(p, ['radno_vrijeme', 'Radno_vrijeme']);
        const titleStr = firstStringProp(p, ['naziv', 'NAZIV']) || 'Tržnica';
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={firstStringProp(p, ['adresa', 'ADRESA'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="markets"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Email: firstStringProp(p, ['email', 'Email']),
                'Informacije (poveznica)':
                  infoLink && /^https?:\/\//i.test(infoLink) ? infoLink : undefined,
                'Radno vrijeme': infoLink && !/^https?:\/\//i.test(infoLink) ? infoLink : undefined,
                Telefon: firstStringProp(p, ['telefon', 'Telefon']),
                Web: firstStringProp(p, ['web', 'Web']),
              }}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
