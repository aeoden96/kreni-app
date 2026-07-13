import type { Feature, Point } from 'geojson';

import L from 'leaflet';
import { memo, useEffect, useMemo, useState } from 'react';
import { Marker } from 'react-leaflet';

import { useCityPointLayerRegistration } from '../../../../hooks/useCityPointLayerRegistration';
import { cachedFetch, dataFetch } from '../../../../stores/dataCache';
import { parseTitleForFavourite } from '../../../../utils/mapPlaceFavouriteKey';
import { annotateCityClusterFeatures } from '../../cityPointClusterAnnotate';
import { MapFavouriteStarButton } from '../../MapFavouriteStarButton';
import { MapTooltip } from '../../MapTooltip';

interface BikeParkingsProps {
  show: boolean;
}

interface ParkingData {
  capacity: number;
  id: number;
  lat: number;
  lng: number;
  name: string;
  stands: number;
}

export const BikeParkings = memo(function BikeParkings({ show }: BikeParkingsProps) {
  const [parkings, setParkings] = useState<ParkingData[]>([]);

  useEffect(() => {
    if (!show || parkings.length > 0) return;

    const url = `${import.meta.env.BASE_URL}static_data/bike_parkings.json`;
    cachedFetch(url, () => dataFetch(url).then((res) => res.json()))
      .then((data) => setParkings(data))
      .catch((err) => console.error('Failed to load bike parkings:', err));
  }, [show, parkings]);

  const clusterFeatures = useMemo((): Feature<Point>[] => {
    return parkings.map((p) => ({
      geometry: { coordinates: [p.lng, p.lat], type: 'Point' },
      properties: {
        capacity: p.capacity,
        id: String(p.id),
        name: p.name,
        stands: p.stands,
      },
      type: 'Feature',
    }));
  }, [parkings]);

  const featuresForCluster = useMemo(
    () => annotateCityClusterFeatures(clusterFeatures, 'bikeParkings'),
    [clusterFeatures]
  );

  const useCluster = useCityPointLayerRegistration(
    'bikeParkings',
    show,
    parkings.length > 0,
    featuresForCluster
  );

  if (!show || !parkings.length) return null;
  if (useCluster) return null;

  return (
    <>
      {parkings.map((parking) => {
        const hasStands = parking.stands > 0;

        const iconHtml = `
          <div class="flex items-center justify-center w-6 h-6 rounded-md shadow-md text-white font-bold text-[11px]"
               style="background-color: ${hasStands ? '#10b981' : '#64748b'}; border: 1.5px solid white;">
            P
          </div>
        `;

        const icon = L.divIcon({
          className: 'bike-parking-icon',
          html: iconHtml,
          iconAnchor: [12, 12],
          iconSize: [24, 24],
        });

        const title = parseTitleForFavourite(parking.name);

        return (
          <Marker
            icon={icon}
            key={`parking-${parking.id}`}
            position={[parking.lat, parking.lng]}
            zIndexOffset={400}
          >
            <MapTooltip
              direction="top"
              headerActions={
                <MapFavouriteStarButton
                  lat={parking.lat}
                  layerId="bikeParkings"
                  lng={parking.lng}
                  sourceId={String(parking.id)}
                  title={title}
                />
              }
              keyValues={{
                Stalaka: parking.stands || '?',
                ...(parking.capacity > 0 ? { 'Mjesta za bicikle': parking.capacity } : {}),
              }}
              offset={[0, -12]}
              title={parking.name}
            />
          </Marker>
        );
      })}
    </>
  );
});
