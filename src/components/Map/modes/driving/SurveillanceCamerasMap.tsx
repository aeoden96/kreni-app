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

export const SurveillanceCamerasMap = memo(function SurveillanceCamerasMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'driving' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>(
    'surveillance-cameras.geojson',
    show,
    { logErrorLabel: 'surveillance cameras' }
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
    return annotateCityClusterFeatures(valid, 'surveillanceCameras');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'surveillanceCameras',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'camera-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 border-2 border-white shadow-lg text-[13px]">📹</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const naziv = firstStringProp(p, ['naziv', 'NAZIV']);
        const lokacija = firstStringProp(p, ['lokacija', 'Lokacija']);
        const adresa = firstStringProp(p, ['adresa', 'ADRESA']);
        const title = naziv || lokacija || 'Nadzorna kamera';
        const description = adresa || (lokacija && lokacija !== title ? lokacija : undefined);
        const markerKey = firstStringProp(p, ['OBJECTID', 'OBJECTID_1', 'objectid']) ?? `cam-${i}`;
        const sourceId = firstStringProp(p, ['OBJECTID', 'OBJECTID_1', 'objectid']);
        return (
          <Marker icon={icon} key={markerKey} position={[coords[1], coords[0]]}>
            <MapTooltip
              className="custom-tooltip shadow-lg"
              description={description}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="surveillanceCameras"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={title}
                />
              }
              keyValues={{
                Email: firstStringProp(p, ['email', 'Email']),
                Fax: firstStringProp(p, ['fax', 'Fax']),
                Izradio: firstStringProp(p, ['izradio', 'Izradio']),
                Izvor: firstStringProp(p, ['izvor', 'Izvor']),
                'Nadležno tijelo': firstStringProp(p, ['nadlezan', 'Nadlezan']),
                Osnivač: firstStringProp(p, ['osnivac', 'Osnivac']),
                Telefon: firstStringProp(p, ['telefon', 'Telefon']),
                Web: firstStringProp(p, ['web', 'Web']),
              }}
              offset={[0, -14]}
              title={title}
            />
          </Marker>
        );
      })}
    </>
  );
});
