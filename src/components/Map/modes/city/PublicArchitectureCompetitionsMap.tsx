import type { FeatureCollection, Point } from 'geojson';

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';

import { STATIC_DATA_URL } from '../../../../config';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetchWithTTL } from '../../../../stores/dataCache';
import { parsePublicArchitectureCompetitionsCsv } from '../../../../utils/csvPointParsers';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { geoJsonLngLatInMapBounds } from '../../../../utils/geoViewportCulling';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

const URL = `${STATIC_DATA_URL}/public-architecture-competitions`;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface Props {
  show: boolean;
}

export const PublicArchitectureCompetitionsMap = memo(function PublicArchitectureCompetitionsMap({
  show,
}: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    cachedFetchWithTTL(
      URL,
      async () => {
        const response = await fetch(URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch architecture competitions CSV (${response.status})`);
        }

        return parsePublicArchitectureCompetitionsCsv(await response.text());
      },
      ONE_WEEK_MS
    )
      .then((data) => setGeoData(data))
      .catch((error) => console.error('Failed to load architecture competitions:', error));
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

  if (!show || !geoData) return null;
  if (!shouldRenderDetail) return null;

  const icon = L.divIcon({
    className: 'public-architecture-competitions-icon',
    html: `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 border-2 border-white shadow-lg text-[14px]">🏗️</div>`,
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
        const titleStr = (p.KR_NAZ_LOK as string) || 'Arhitektonski natječaj';
        const sourceId = firstStringProp(pr, ['OBJECTID', 'objectid', 'ObjectID']);

        return (
          <Marker
            icon={icon}
            key={`${p.OBJECTID ?? 'architecture'}-${index}`}
            position={[coords[1], coords[0]]}
          >
            <MapTooltip
              description={p.PUNI_NAZIV}
              headerActions={
                <MapFavouriteStarButton
                  lat={coords[1]}
                  layerId="publicArchitectureCompetitions"
                  lng={coords[0]}
                  sourceId={sourceId}
                  title={titleStr}
                />
              }
              keyValues={{
                Godina: p.GODINA_,
                'Gradska četvrt': p.IME_GC,
                Namjena: p.NAMJENA_OB,
                Status: p.STATUS_,
                'Status natječaja': p.STATUS_NATJECAJA,
              }}
              title={titleStr}
            />
          </Marker>
        );
      })}
    </>
  );
});
