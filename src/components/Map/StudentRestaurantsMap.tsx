import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetch, dataFetch } from '../../stores/dataCache';

interface StudentRestaurantsMapProps {
    show: boolean;
}

export const StudentRestaurantsMap = memo(function StudentRestaurantsMap({ show }: StudentRestaurantsMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/studentski_restorani.json`;
        cachedFetch(url, () => dataFetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load student restaurants:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    const icon = L.divIcon({
        html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg text-white">
                🍴
            </div>
        `,
        className: 'student-restaurant-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    return (
        <>
            {geoData.features.map((feature, i) => {
                const coords = (feature.geometry as Point).coordinates;
                return (
                    <Marker
                        key={i}
                        position={[coords[1], coords[0]]}
                        icon={icon}
                    >
                        <Tooltip direction="top" offset={[0, -16]} className="custom-tooltip shadow-lg">
                            <div className="text-sm font-bold">{feature.properties?.naziv}</div>
                            <div className="text-xs text-base-content/70">{feature.properties?.adresa}</div>
                            {feature.properties?.web && (
                                <div className="text-[10px] text-primary underline mt-1 truncate max-w-[200px]">
                                    {feature.properties.web}
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
