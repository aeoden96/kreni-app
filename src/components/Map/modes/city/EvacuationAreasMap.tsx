import type { Feature, FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';

import { Fragment, memo, useMemo } from 'react';
import { Polygon as LeafletPolygon, Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { useStaticDatasetJson } from '../../../../hooks/useStaticDatasetJson';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import {
  polygonExteriorsLatLngs,
  polygonGeometryBBoxCenterLatLng,
} from '../../../../utils/geoJsonPolygonLeaflet';
import { firstNumberProp, firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { polygonGeometryIntersectsMapBounds } from '../../../../utils/geoViewportCulling';
import { defaultGetSourceIdForLayer } from '../../../../utils/mapPlaceFavouriteKey';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';
import {
  createPolygonCentroidDivIcon,
  polygonCentroidBadgeHtml,
} from '../../polygonCentroidDivIcon';

interface Props {
  show: boolean;
}

function evacuationTooltipProps(p: Record<string, unknown>) {
  const name = firstStringProp(p, ['NAZIV', 'naziv']) || 'Evakuacijsko područje';
  const type = firstStringProp(p, ['Tip', 'tip']);
  const district = firstStringProp(p, ['G_cetvrt', 'g_cetvrt', 'grad_cetvrt']);
  const areaHaRaw = firstNumberProp(p, ['Povrsina_ha', 'povrsina_ha']);
  const areaHa =
    areaHaRaw !== undefined && Number.isFinite(areaHaRaw)
      ? `${areaHaRaw.toFixed(2)} ha`
      : undefined;
  return { areaHa, district, name, type };
}

export const EvacuationAreasMap = memo(function EvacuationAreasMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<MultiPolygon | Polygon>>(
    'evacuation-areas.geojson',
    show,
    { logErrorLabel: 'evacuation areas' }
  );

  const featuresForCluster = useMemo(() => {
    if (!geoData) return [];
    const points: Feature<Point>[] = [];
    for (const f of geoData.features) {
      const g = f.geometry;
      if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
      const center = polygonGeometryBBoxCenterLatLng(g);
      if (!center) continue;
      const [lat, lng] = center;
      points.push({
        geometry: { coordinates: [lng, lat], type: 'Point' },
        properties: f.properties,
        type: 'Feature',
      });
    }
    return annotateCityClusterFeatures(points, 'evacuation');
  }, [geoData]);

  const useCluster = useCityPointLayerRegistration(
    'evacuation',
    show,
    Boolean(geoData),
    featuresForCluster
  );

  const visibleFeatures = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    return geoData.features.filter((feature) => {
      const g = feature.geometry;
      if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return false;
      return polygonGeometryIntersectsMapBounds(bounds, g);
    });
  }, [bounds, geoData, shouldRenderDetail]);

  const icon = useMemo(
    () =>
      createPolygonCentroidDivIcon({
        className: 'evacuation-area-centroid-icon',
        html: polygonCentroidBadgeHtml({ bgClass: 'bg-orange-500', emoji: '🚨' }),
      }),
    []
  );

  if (!show || !geoData) return null;
  if (!shouldRenderDetail) return null;

  return (
    <>
      {visibleFeatures.map((feature, fi) => {
        const g = feature.geometry;
        if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return null;
        const parts = polygonExteriorsLatLngs(g);
        const p = (feature.properties ?? {}) as Record<string, unknown>;
        const t = evacuationTooltipProps(p);
        const center = !useCluster ? polygonGeometryBBoxCenterLatLng(g) : null;
        const starCenter = polygonGeometryBBoxCenterLatLng(g);
        return (
          <Fragment key={`evac-${fi}`}>
            {parts.map((positions, pi) => (
              <LeafletPolygon
                key={`evac-poly-${fi}-${pi}`}
                pathOptions={{
                  color: '#f97316',
                  fillColor: '#f97316',
                  fillOpacity: 0.15,
                  opacity: 0.7,
                  weight: 2,
                }}
                positions={positions}
              >
                {useCluster ? (
                  <MapTooltip
                    description={t.type}
                    headerActions={
                      starCenter ? (
                        <MapFavouriteStarButton
                          lat={starCenter[0]}
                          layerId="evacuation"
                          lng={starCenter[1]}
                          sourceId={defaultGetSourceIdForLayer('evacuation', p)}
                          title={t.name}
                        />
                      ) : null
                    }
                    keyValues={{
                      'Gradska četvrt': t.district,
                      Površina: t.areaHa,
                    }}
                    title={t.name}
                  />
                ) : null}
              </LeafletPolygon>
            ))}
            {center ? (
              <Marker icon={icon} position={[center[0], center[1]]}>
                <MapTooltip
                  description={t.type}
                  headerActions={
                    starCenter ? (
                      <MapFavouriteStarButton
                        lat={starCenter[0]}
                        layerId="evacuation"
                        lng={starCenter[1]}
                        sourceId={defaultGetSourceIdForLayer('evacuation', p)}
                        title={t.name}
                      />
                    ) : null
                  }
                  keyValues={{
                    'Gradska četvrt': t.district,
                    Površina: t.areaHa,
                  }}
                  title={t.name}
                />
              </Marker>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
});
