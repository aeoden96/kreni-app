import { memo, useEffect, useState, useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetch } from '../../stores/dataCache';

interface RailwayStationsMapProps {
    show: boolean;
}

export const RailwayStationsMap = memo(function RailwayStationsMap({ show }: RailwayStationsMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/zeljeznicke_postaje.json`;
        cachedFetch(url, () => fetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load railway stations:', err));
    }, [show, geoData]);

    const icon = useMemo(() => L.divIcon({
        html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-red-700 border-2 border-white shadow-lg text-white font-bold text-base">
                🚆
            </div>
        `,
        className: 'railway-station-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    }), []);

    if (!show || !geoData) return null;

    return (
        <>
            {geoData.features.map((feature) => {
                const coords = (feature.geometry as Point).coordinates;
                if (!coords || coords.length < 2) return null;
                const props = feature.properties;
                return (
                    <Marker
                        key={props?.OBJECTID ?? props?.Sifra}
                        position={[coords[1], coords[0]]}
                        icon={icon}
                    >
                        <Tooltip direction="top" offset={[0, -16]} className="custom-tooltip shadow-lg !p-3">
                            <div className="text-base font-bold text-base-content mb-1">{props?.Naziv}</div>
                            {props?.Vrsta && (
                                <div className="text-sm text-base-content/70">{props.Vrsta}</div>
                            )}
                            {props?.Opis && (
                                <div className="text-xs text-base-content/60 mt-1">{props.Opis}</div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
