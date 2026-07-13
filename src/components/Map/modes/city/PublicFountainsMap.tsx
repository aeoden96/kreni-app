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

interface PublicFountainsMapProps {
  show: boolean;
}

function formatDate(ts: null | number | undefined): null | string {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('hr-HR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function statusClass(status: null | string | undefined): string {
  if (!status) return 'text-base-content/50';
  if (status === 'u funkciji') return 'text-success';
  if (status === 'nije u funkciji') return 'text-error';
  return 'text-warning';
}

export const PublicFountainsMap = memo(function PublicFountainsMap({
  show,
}: PublicFountainsMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<Point>>(
    'public-water-fountains.geojson',
    show,
    { logErrorLabel: 'public fountains' }
  );

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
    return annotateCityClusterFeatures(valid, 'fountains');
  }, [geoData, shouldRenderDetail]);

  const useCluster = useCityPointLayerRegistration(
    'fountains',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  if (!show || !geoData) return null;
  if (useCluster) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'public-fountain-icon',
    html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg text-white text-[12px]">
                💧
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

        const props = feature.properties ?? {};
        const status: null | string = (props.status_odrz as null | string) || null;
        const datumTeren = formatDate(props.datum_teren as null | number);
        const napomenaTeren: null | string = (props.napomena_teren as string) || null;
        const lok = firstStringProp(props, ['lokacija', 'Lokacija']);
        const titleStr = firstStringProp(props, ['tip_zdenca', 'Tip_zdenca']) || 'Javni zdenac';
        const sourceId = firstStringProp(props, ['OBJECTID', 'objectid', 'ObjectID']);

        return (
          <Marker icon={icon} key={i} position={[coords[1], coords[0]]}>
            <MapTooltip
              description={
                <>
                  {lok && (
                    <div className="text-[11px] sm:text-xs text-base-content/70 leading-snug break-words [overflow-wrap:anywhere]">
                      {lok}
                    </div>
                  )}
                  <div
                    className={`text-[11px] sm:text-xs mt-0.5 font-semibold leading-snug ${statusClass(status)}`}
                  >
                    {status || 'Status nepoznat'}
                  </div>
                  {datumTeren && (
                    <div className="text-[10px] text-base-content/60 mt-0.5 leading-snug">
                      Održavanje: {datumTeren}
                    </div>
                  )}
                  {napomenaTeren && (
                    <div className="text-[10px] text-base-content/60 italic mt-0.5 leading-snug break-words [overflow-wrap:anywhere]">
                      {napomenaTeren}
                    </div>
                  )}
                </>
              }
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="fountains"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                'Broj vodomjera': firstStringProp(props, ['broj_vodomjera']),
                'Gradska četvrt': firstStringProp(props, ['naziv_gc']),
                'Katastarska općina': firstStringProp(props, ['ko_naziv']),
                'Napomena (održavanje)': firstStringProp(props, ['napomena_odrzavanje']),
                'Teren (stanje)': firstStringProp(props, ['teren_dane', 'status_unos']),
              }}
              offset={[0, -12]}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
