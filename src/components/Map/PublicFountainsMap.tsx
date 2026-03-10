import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetch } from '../../stores/dataCache';

interface PublicFountainsMapProps {
    show: boolean;
}

export const PublicFountainsMap = memo(function PublicFountainsMap({ show }: PublicFountainsMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/javni_zdenci.json`;
        cachedFetch(url, () => fetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load public fountains:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    const icon = L.divIcon({
        html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg text-white text-[12px]">
                💧
            </div>
        `,
        className: 'public-fountain-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });

    return (
        <>
            {geoData.features.map((feature, i) => {
                const coords = (feature.geometry as Point).coordinates;
                if (!coords || coords.length < 2) return null;

                return (
                    <Marker
                        key={i}
                        position={[coords[1], coords[0]]}
                        icon={icon}
                    >
                        <Tooltip direction="top" offset={[0, -12]} className="custom-tooltip shadow-lg">
                            <div className="text-sm font-bold">{feature.properties?.tip_zdenca || 'Javni zdenac'}</div>
                            <div className="text-xs text-base-content/70">{feature.properties?.lokacija}</div>
                            {feature.properties?.ispravnost && (
                                <div className={`text-[10px] mt-1 font-semibold ${feature.properties.ispravnost.toLowerCase().includes('ispravan') ? 'text-success' : 'text-error'}`}>
                                    Status: {feature.properties.ispravnost}
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
