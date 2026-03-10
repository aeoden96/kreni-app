import { memo, useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import { cachedFetch } from '../../stores/dataCache';
import type { FeatureCollection, LineString, MultiLineString } from 'geojson';

interface BikePathsProps {
    show: boolean;
}

export const BikePaths = memo(function BikePaths({ show }: BikePathsProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<LineString | MultiLineString> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/bike_paths.geojson`;
        cachedFetch(url, () => fetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load bike paths:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    return (
        <GeoJSON
            data={geoData}
            style={(feature) => {
                const category = feature?.properties?.kategorija_id;
                let color = '#eab308'; // Default yellow/warning color for paths
                if (category === 'PB') color = '#eab308'; // Pjesacko-biciklisticki
                if (category === 'BP') color = '#84cc16'; // Nature path (Nasip)
                if (category === 'BT') color = '#22d3ee'; // Biciklisticka traka
                if (category === 'CM') color = '#a855f7'; // Cesta mjesovitog prometa

                return {
                    color,
                    weight: 3,
                    opacity: 0.8,
                    dashArray: category === 'BP' ? '5, 5' : undefined,
                };
            }}
        />
    );
});
