import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Polygon } from 'react-leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { cachedFetch } from '../../stores/dataCache';
import type { ParkingZonesData, ParkingZoneProperties, GeoJSONParkingFeature } from '../../types/parkingZones';
import { ParkingZoneModal } from './ParkingZoneModal';

interface ParkingZonesMapProps {
    show: boolean;
}

export const ParkingZonesMap = memo(function ParkingZonesMap({ show }: ParkingZonesMapProps) {
    const [data, setData] = useState<ParkingZonesData | null>(null);
    const [selectedZone, setSelectedZone] = useState<ParkingZoneProperties | null>(null);

    useEffect(() => {
        if (!show || data) return;

        const url = `${import.meta.env.BASE_URL}static_data/parking_zones.json`;
        cachedFetch(url, () => fetch(url).then(res => res.json()))
            .then((d: ParkingZonesData) => setData(d))
            .catch(err => console.error('Failed to load parking zones:', err));
    }, [show, data]);

    if (!show || !data) return null;

    return (
        <>
            {data.features.map((feature: GeoJSONParkingFeature) => {
                // GeoJSON coordinates are [lng, lat]; Leaflet expects [lat, lng]
                const positions = feature.geometry.coordinates[0].map(
                    ([lng, lat]) => [lat, lng] as [number, number],
                );
                const color = feature.properties.color;

                return (
                    <Polygon
                        key={feature.properties.id}
                        positions={positions}
                        pathOptions={{
                            color: color,
                            weight: 1.5,
                            opacity: 0.7,
                            fillColor: color,
                            fillOpacity: 0.35,
                        }}
                        eventHandlers={{
                            click: (_e: LeafletMouseEvent) => {
                                setSelectedZone(feature.properties);
                            },
                            mouseover: (e: LeafletMouseEvent) => {
                                e.target.setStyle({ fillOpacity: 0.55, weight: 2.5 });
                            },
                            mouseout: (e: LeafletMouseEvent) => {
                                e.target.setStyle({ fillOpacity: 0.35, weight: 1.5 });
                            },
                        }}
                    />
                );
            })}

            {selectedZone && createPortal(
                <ParkingZoneModal
                    zone={selectedZone}
                    zoneInfo={data.zoneInfo}
                    onClose={() => setSelectedZone(null)}
                />,
                document.body,
            )}
        </>
    );
});
