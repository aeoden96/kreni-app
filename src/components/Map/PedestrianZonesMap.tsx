import { memo, useEffect, useState } from 'react';
import { GeoJSON, Tooltip } from 'react-leaflet';
import type { FeatureCollection, MultiPolygon } from 'geojson';
import { cachedFetch, dataFetch } from '../../stores/dataCache';

interface PedestrianZonesMapProps {
    show: boolean;
}

export const PedestrianZonesMap = memo(function PedestrianZonesMap({ show }: PedestrianZonesMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<MultiPolygon> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/pjesacka_zona.geojson`;
        cachedFetch(url, () => dataFetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load pedestrian zones:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    return (
        <GeoJSON
            data={geoData}
            style={() => ({
                color: '#ec4899', // Pink-500
                weight: 2,
                opacity: 0.6,
                fillColor: '#ec4899',
                fillOpacity: 0.2,
            })}
        >
            <Tooltip sticky className="custom-tooltip shadow-lg">
                <div className="text-sm font-bold">Pješačka zona</div>
                <div className="text-xs text-base-content/70">Promet zabranjen za motorna vozila</div>
            </Tooltip>
        </GeoJSON>
    );
});
