import type { LeafletMouseEvent } from 'leaflet';

import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Polygon } from 'react-leaflet';

import type {
  GeoJSONParkingFeature,
  ParkingZoneProperties,
  ParkingZonesData,
} from '../../../../types/parkingZones';

import { useStaticLayerRenderGate } from '../../../../hooks/useStaticLayerRenderGate';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { parkingOuterRingIntersectsMapBounds } from '../../../../utils/geoViewportCulling';
import { ParkingZoneModal } from './ParkingZoneModal';

interface ParkingZonesMapProps {
  show: boolean;
}

export const ParkingZonesMap = memo(function ParkingZonesMap({ show }: ParkingZonesMapProps) {
  const { bounds, shouldRenderDetail } = useStaticLayerRenderGate({ variant: 'driving' });
  const [data, setData] = useState<null | ParkingZonesData>(null);
  const [selectedZone, setSelectedZone] = useState<null | ParkingZoneProperties>(null);

  useEffect(() => {
    if (!show || data) return;

    const url = `${import.meta.env.BASE_URL}static_data/parking_zones.json`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((d: ParkingZonesData) => setData(d))
      .catch((err) => console.error('Failed to load parking zones:', err));
  }, [show, data]);

  const visibleFeatures = useMemo(() => {
    if (!data || !shouldRenderDetail) return [];
    return data.features.filter((feature: GeoJSONParkingFeature) =>
      parkingOuterRingIntersectsMapBounds(
        bounds,
        feature.geometry.coordinates[0] as [number, number][]
      )
    );
  }, [bounds, data, shouldRenderDetail]);

  if (!show || !data) return null;
  if (!shouldRenderDetail) return null;

  return (
    <>
      {visibleFeatures.map((feature: GeoJSONParkingFeature) => {
        // GeoJSON coordinates are [lng, lat]; Leaflet expects [lat, lng]
        const positions = feature.geometry.coordinates[0].map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );
        const color = feature.properties.color;

        return (
          <Polygon
            eventHandlers={{
              click: (_e: LeafletMouseEvent) => {
                setSelectedZone(feature.properties);
              },
              mouseout: (e: LeafletMouseEvent) => {
                e.target.setStyle({ fillOpacity: 0.35, weight: 1.5 });
              },
              mouseover: (e: LeafletMouseEvent) => {
                e.target.setStyle({ fillOpacity: 0.55, weight: 2.5 });
              },
            }}
            key={feature.properties.id}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.35,
              opacity: 0.7,
              weight: 1.5,
            }}
            positions={positions}
          />
        );
      })}

      {selectedZone &&
        createPortal(
          <ParkingZoneModal
            onClose={() => setSelectedZone(null)}
            zone={selectedZone}
            zoneInfo={data.zoneInfo}
          />,
          document.body
        )}
    </>
  );
});
