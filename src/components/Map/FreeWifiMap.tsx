import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Wifi } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetch, dataFetch } from '../../stores/dataCache';

interface FreeWifiMapProps {
    show: boolean;
}

export const FreeWifiMap = memo(function FreeWifiMap({ show }: FreeWifiMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/besplatna_wifi_mreza.json`;
        cachedFetch(url, () => dataFetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load free wifi:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    const wifiIconHtml = renderToString(<Wifi className="w-4 h-4 text-white" />);

    const icon = L.divIcon({
        html: `
            <div class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 border-2 border-white shadow-lg">
                ${wifiIconHtml}
            </div>
        `,
        className: 'free-wifi-icon',
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
                            <div className="text-sm font-bold">Besplatna WiFi mreža</div>
                            <div className="text-xs text-base-content/70">{feature.properties?.lokacija}</div>
                            {feature.properties?.nadlezan && (
                                <div className="text-[10px] mt-1 italic text-base-content/60">
                                    Nadležan: {feature.properties.nadlezan}
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
