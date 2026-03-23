import L from 'leaflet';
import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';

import { cachedFetch, dataFetch } from '../../stores/dataCache';

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

  if (!show || !parkings.length) return null;

  return (
    <>
      {parkings.map((parking) => {
        // Determine icon based on stands or capacity
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

        return (
          <Marker
            icon={icon}
            key={`parking-${parking.id}`}
            position={[parking.lat, parking.lng]}
            zIndexOffset={400}
          >
            <Tooltip className="custom-tooltip shadow-lg" direction="top" offset={[0, -12]}>
              <div className="text-sm font-semibold mb-1">{parking.name}</div>
              <div className="flex gap-4 text-xs text-base-content/80">
                <div>
                  <span className="font-bold text-success">{parking.stands || '?'}</span>
                  <span className="ml-1">stalaka</span>
                </div>
                {parking.capacity > 0 && (
                  <div>
                    <span className="font-bold text-info">{parking.capacity}</span>
                    <span className="ml-1">mjesta za bicikle</span>
                  </div>
                )}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
});
