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

export const CulturalInstitutionsMap = memo(function CulturalInstitutionsMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>(
    'cultural-institutions.geojson',
    show,
    { logErrorLabel: 'cultural institutions' }
  );

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
    return annotateCityClusterFeatures(valid, 'cultural');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'cultural',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'cultural-inst-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500 border-2 border-white shadow-lg text-[13px]">🏛️</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const titleStr = firstStringProp(p, ['naziv', 'NAZIV']) || 'Kulturna ustanova';
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={firstStringProp(p, ['adresa', 'ADRESA'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="cultural"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Email: firstStringProp(p, ['email', 'Email']),
                'Energetski razred': firstStringProp(p, ['energetski_razred']),
                'Radno vrijeme': firstStringProp(p, ['radno_vrijeme', 'Radno_vrijeme']),
                Telefon: firstStringProp(p, ['telefon', 'Telefon']),
                Ustanove: firstStringProp(p, ['ustanove', 'Ustanove']),
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
