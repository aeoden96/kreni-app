import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

import { memo, useEffect, useMemo, useState } from 'react';
import { Polygon as LeafletPolygon } from 'react-leaflet';

import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { polygonExteriorsLatLngs } from '../../../../utils/geoJsonPolygonLeaflet';
import { firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { polygonGeometryIntersectsMapBounds } from '../../../../utils/geoViewportCulling';
import { MapTooltip } from '../../MapTooltip';

interface PedestrianZonesMapProps {
  show: boolean;
}

export const PedestrianZonesMap = memo(function PedestrianZonesMap({
  show,
}: PedestrianZonesMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'city' });
  const [geoData, setGeoData] = useState<FeatureCollection<MultiPolygon | Polygon> | null>(null);

  useEffect(() => {
    if (!show || geoData) return;

    const url = `${import.meta.env.BASE_URL}static_data/pjesacka_zona.geojson`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((data) => setGeoData(data))
      .catch((err) => console.error('Failed to load pedestrian zones:', err));
  }, [show, geoData]);

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
        const title = firstStringProp(p, ['naziv', 'NAZIV']) || 'Pješačka zona';
        return parts.map((positions, pi) => (
          <LeafletPolygon
            key={`pz-${fi}-${pi}`}
            pathOptions={{
              color: '#ec4899',
              fillColor: '#ec4899',
              fillOpacity: 0.2,
              opacity: 0.6,
              weight: 2,
            }}
            positions={positions}
          >
            <MapTooltip description="Promet zabranjen za motorna vozila" sticky title={title} />
          </LeafletPolygon>
        ));
      })}
    </>
  );
});
