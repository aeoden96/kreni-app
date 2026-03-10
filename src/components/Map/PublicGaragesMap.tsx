import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetch } from '../../stores/dataCache';

interface PublicGaragesMapProps {
    show: boolean;
}

export const PublicGaragesMap = memo(function PublicGaragesMap({ show }: PublicGaragesMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;

        const url = `${import.meta.env.BASE_URL}static_data/javne_garaze.json`;
        cachedFetch(url, () => fetch(url).then(res => res.json()))
            .then(data => setGeoData(data))
            .catch(err => console.error('Failed to load public garages:', err));
    }, [show, geoData]);

    if (!show || !geoData) return null;

    const icon = L.divIcon({
        html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white font-bold text-lg">
                P
            </div>
        `,
        className: 'public-garage-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    return (
        <>
            {geoData.features.map((feature) => {
                const coords = (feature.geometry as Point).coordinates;
                const props = feature.properties;
                return (
                    <Marker
                        key={props?.id}
                        position={[coords[1], coords[0]]}
                        icon={icon}
                    >
                        <Tooltip direction="top" offset={[0, -16]} className="custom-tooltip shadow-lg !p-3">
                            <div className="text-base font-bold text-base-content mb-1">{props?.naziv}</div>
                            <div className="text-sm text-base-content/80 mb-2">{props?.adresa}</div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-base-200/50 p-2 rounded-lg">
                                <div className="text-base-content/60">Kapacitet:</div>
                                <div className="font-semibold text-right">{props?.kapacitet ?? 'N/A'}</div>

                                {props?.invalidska_mj != null && props.invalidska_mj > 0 && (
                                    <>
                                        <div className="text-base-content/60">Invalidska mj.:</div>
                                        <div className="font-semibold text-right">{props.invalidska_mj}</div>
                                    </>
                                )}

                                {props?.punionica_za_EV != null && props.punionica_za_EV > 0 && (
                                    <>
                                        <div className="text-base-content/60">Punjači (EV):</div>
                                        <div className="text-success font-semibold text-right">{props.punionica_za_EV}</div>
                                    </>
                                )}
                            </div>

                            {props?.telefon && (
                                <div className="text-xs text-base-content/50 mt-2">
                                    Tel: {props.telefon}
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
