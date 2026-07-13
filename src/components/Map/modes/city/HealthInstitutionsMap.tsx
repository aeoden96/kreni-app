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

export const HealthInstitutionsMap = memo(function HealthInstitutionsMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>(
    'health-institutions.geojson',
    show,
    { logErrorLabel: 'health institutions' }
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
    return annotateCityClusterFeatures(valid, 'healthInst');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'healthInst',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'health-inst-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow-lg text-[13px]">🏨</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const titleStr = firstStringProp(p, ['naziv', 'NAZIV']) || 'Zdravstvena ustanova';
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={firstStringProp(p, ['adresa', 'ADRESA'])}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="healthInst"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Email: firstStringProp(p, ['email', 'Email']),
                Fax: firstStringProp(p, ['fax', 'Fax']),
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
