import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useMemo } from 'react';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticDatasetJson } from '../../../../hooks/useStaticDatasetJson';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { acceptedMaterialsLine } from '../../../../utils/recyclingAcceptedMaterials';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface Props {
  show: boolean;
}

export const RecyclingYardsMap = memo(function RecyclingYardsMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>('recycling-yards.geojson', show, {
    logErrorLabel: 'recycling yards',
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
    return annotateCityClusterFeatures(valid, 'recycling');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'recycling',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'recycling-yard-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-lg text-[13px]">♻️</div>`,
    iconAnchor: [14, 14],
    iconSize: [28, 28],
  });

  return (
    <>
      {visibleFeatures.map((f, i) => {
        const coords = (f.geometry as Point).coordinates;
        if (!coords || coords.length < 2) return null;
        const p = f.properties ?? {};
        const title = firstStringProp(p, ['NAZIV', 'naziv', 'NAZIV_PUNI']) || 'Reciklažno dvorište';
        const address = firstStringProp(p, ['ADRESA_LOK', 'ADRESA', 'adresa']);
        const napomena = firstStringProp(p, ['NAPOMENA', 'napomena']);
        const sourceId = firstStringProp(p, ['OBJECTID', 'objectid', 'ObjectID', 'FID']);
        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={address}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="recycling"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={title}
                />
              }
              keyValues={{
                'E-mail': firstStringProp(p, ['E_MAIL', 'e_mail', 'email']),
                Napomena:
                  napomena && napomena.length > 280 ? `${napomena.slice(0, 277)}…` : napomena,
                Prihvata: acceptedMaterialsLine(p),
                'Radno vrijeme': firstStringProp(p, ['RADNO_VRIJ', 'radno_vrij']),
                Telefon: firstStringProp(p, ['TELEFON', 'telefon']),
                Vrsta: firstStringProp(p, ['VRSTA', 'vrsta']),
                Web: firstStringProp(p, ['WEB', 'web']),
              }}
              title={title}
            />
          </Marker>
        );
      })}
    </>
  );
});
