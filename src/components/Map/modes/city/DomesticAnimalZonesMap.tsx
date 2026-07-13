import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { memo, useMemo } from 'react';
import { Polygon as LeafletPolygon } from 'react-leaflet';

import { useStaticDatasetJson } from '../../../../hooks/useStaticDatasetJson';
import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { polygonExteriorsLatLngs } from '../../../../utils/geoJsonPolygonLeaflet';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { polygonGeometryIntersectsMapBounds } from '../../../../utils/geoViewportCulling';
import { MapTooltip } from '../../MapTooltip';

interface Props {
  show: boolean;
}

export const DomesticAnimalZonesMap = memo(function DomesticAnimalZonesMap({ show }: Props) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const geoData = useStaticDatasetJson<FeatureCollection<MultiPolygon | Polygon>>(
    'domestic-animals-zones.geojson',
    show,
    { logErrorLabel: 'domestic animal zones' }
  );

  const visibleFeatures = useMemo(() => {
    if (!geoData || !shouldRenderDetail) return [];
    return geoData.features.filter((feature) => {
      const g = feature.geometry;
      if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return false;
      return polygonGeometryIntersectsMapBounds(bounds, g);
    });
  }, [bounds, geoData, shouldRenderDetail]);

  if (!show || !geoData) return null;
  if (!shouldRenderDetail) return null;

  return (
    <>
      {visibleFeatures.map((feature, fi) => {
        const g = feature.geometry;
        if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return null;
        const parts = polygonExteriorsLatLngs(g);
        const p = (feature.properties ?? {}) as Record<string, unknown>;
        const title = firstStringProp(p, ['naziv', 'NAZIV']) || 'Zona kućnih životinja';
        return parts.map((positions, pi) => (
          <LeafletPolygon
            key={`daz-${fi}-${pi}`}
            pathOptions={{
              color: '#d97706',
              fillColor: '#d97706',
              fillOpacity: 0.12,
              opacity: 0.6,
              weight: 2,
            }}
            positions={positions}
          >
            <MapTooltip sticky title={title} />
          </LeafletPolygon>
        ));
      })}
    </>
  );
});
