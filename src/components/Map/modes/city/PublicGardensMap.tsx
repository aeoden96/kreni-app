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

function gardenTooltipProps(p: Record<string, unknown>) {
  const name = firstStringProp(p, ['naziv', 'NAZIV']) || 'Gradski vrt';
  const district = firstStringProp(p, ['grad_cetvrt', 'G_cetvrt', 'g_cetvrt']);
  const openingYear = firstStringProp(p, ['godina_otvaranja']);
  const parcelCount = firstNumberProp(p, ['br_vr_parcela']);
  const userCount = firstNumberProp(p, ['br_korisnika']);
  const address = firstStringProp(p, ['adresa']);
  return {
    address,
    district,
    name,
    openingYear,
    parcelCount,
    userCount,
  };
}

export const PublicGardensMap = memo(function PublicGardensMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<MultiPolygon | Polygon>>(
    'public-gardens-geojson.geojson',
    show,
    { logErrorLabel: 'public gardens' }
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
    return annotateCityClusterFeatures(points, 'gardens');
  }, [geoData]);

  const useCluster = useCityPointLayerRegistration(
    'gardens',
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
        className: 'public-garden-icon',
        html: polygonCentroidBadgeHtml({ bgClass: 'bg-green-500', emoji: '🌿' }),
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
        const t = gardenTooltipProps(p);
        const center = !useCluster ? polygonGeometryBBoxCenterLatLng(g) : null;
        const starCenter = polygonGeometryBBoxCenterLatLng(g);
        return (
          <Fragment key={`garden-${fi}`}>
            {parts.map((positions, pi) => (
              <LeafletPolygon
                key={`garden-poly-${fi}-${pi}`}
                pathOptions={{
                  color: '#16a34a',
                  fillColor: '#22c55e',
                  fillOpacity: 0.2,
                  opacity: 0.85,
                  weight: 2,
                }}
                positions={positions}
              >
                {useCluster ? (
                  <MapTooltip
                    description={t.address}
                    headerActions={
                      starCenter ? (
                        <MapFavouriteStarButton
                          lat={starCenter[0]}
                          layerId="gardens"
                          lng={starCenter[1]}
                          sourceId={defaultGetSourceIdForLayer('gardens', p)}
                          title={t.name}
                        />
                      ) : null
                    }
                    keyValues={{
                      'Gradska četvrt': t.district,
                      Korisnici: typeof t.userCount === 'number' ? t.userCount : undefined,
                      Otvoren: t.openingYear,
                      Parcele: typeof t.parcelCount === 'number' ? t.parcelCount : undefined,
                    }}
                    title={t.name}
                  />
                ) : null}
              </LeafletPolygon>
            ))}
            {center ? (
              <Marker icon={icon} position={[center[0], center[1]]}>
                <MapTooltip
                  description={t.address}
                  headerActions={
                    starCenter ? (
                      <MapFavouriteStarButton
                        lat={starCenter[0]}
                        layerId="gardens"
                        lng={starCenter[1]}
                        sourceId={defaultGetSourceIdForLayer('gardens', p)}
                        title={t.name}
                      />
                    ) : null
                  }
                  keyValues={{
                    'Gradska četvrt': t.district,
                    Korisnici: typeof t.userCount === 'number' ? t.userCount : undefined,
                    Otvoren: t.openingYear,
                    Parcele: typeof t.parcelCount === 'number' ? t.parcelCount : undefined,
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
