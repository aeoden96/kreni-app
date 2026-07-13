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

export const PlaygroundsMap = memo(function PlaygroundsMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>(
    'public-playgrounds.geojson',
    show,
    { logErrorLabel: 'playgrounds' }
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
    return annotateCityClusterFeatures(valid, 'playgrounds');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'playgrounds',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'playground-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-lg text-[15px]">⛹️</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const title = p.Vrsta_objekta || p.vrsta_objekta || p.naziv || 'Javno sportsko igralište';
        const location = p.lokacija || p.Lokacija || p.adresa;
        const district = p.Gradska_cetvrt || p.gradska_cetvrt;
        const localBoard = p.Mjesni_odbor || p.mjesni_odbor;
        const sourceId = firstStringProp(p as Record<string, unknown>, [
          'OBJECTID',
          'objectid',
          'ObjectID',
        ]);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={location}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="playgrounds"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={title}
                />
              }
              keyValues={{
                'Gradska četvrt': district,
                'Mjesni odbor': localBoard,
              }}
              title={title}
            />
          </Marker>
        );
      })}
    </>
  );
});
