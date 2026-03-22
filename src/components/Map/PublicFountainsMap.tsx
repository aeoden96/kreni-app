import { memo, useEffect, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { FeatureCollection, Point } from 'geojson';
import { cachedFetchWithTTL } from '../../stores/dataCache';
import { GTFS_PROXY_URL } from '../../config';

const JAVNI_ZDENCI_PROXY_URL = GTFS_PROXY_URL ? `${GTFS_PROXY_URL}?endpoint=javni-zdenci` : null;

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function statusClass(status: string | null | undefined): string {
    if (!status) return 'text-base-content/50';
    if (status === 'u funkciji') return 'text-success';
    if (status === 'nije u funkciji') return 'text-error';
    return 'text-warning';
}

function formatDate(ts: number | null | undefined): string | null {
    if (!ts) return null;
    return new Date(ts).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface PublicFountainsMapProps {
    show: boolean;
}

export const PublicFountainsMap = memo(function PublicFountainsMap({ show }: PublicFountainsMapProps) {
    const [geoData, setGeoData] = useState<FeatureCollection<Point> | null>(null);

    useEffect(() => {
        if (!show || geoData) return;
        if (!JAVNI_ZDENCI_PROXY_URL) {
            console.warn('VITE_GTFS_PROXY_URL is not set – cannot load public fountains');
            return;
        }

        cachedFetchWithTTL(
            JAVNI_ZDENCI_PROXY_URL,
            () => fetch(JAVNI_ZDENCI_PROXY_URL).then(res => res.json()),
            ONE_WEEK_MS
        )
            .then(data => setGeoData(data as FeatureCollection<Point>))
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

                const props = feature.properties ?? {};
                const status: string | null = props.status_odrz || null;
                const datumTeren = formatDate(props.datum_teren as number | null);
                const napomenaTeren: string | null = props.napomena_teren || null;

                return (
                    <Marker
                        key={i}
                        position={[coords[1], coords[0]]}
                        icon={icon}
                    >
                        <Tooltip direction="top" offset={[0, -12]} className="custom-tooltip shadow-lg">
                            <div className="text-sm font-bold">{props.tip_zdenca || 'Javni zdenac'}</div>
                            <div className="text-xs text-base-content/70">{props.lokacija}</div>
                            <div className={`text-[11px] mt-1 font-semibold ${statusClass(status)}`}>
                                {status || 'Status nepoznat'}
                            </div>
                            {datumTeren && (
                                <div className="text-[10px] text-base-content/60 mt-0.5">
                                    Održavanje: {datumTeren}
                                </div>
                            )}
                            {napomenaTeren && (
                                <div className="text-[10px] text-base-content/60 italic mt-0.5">
                                    {napomenaTeren}
                                </div>
                            )}
                        </Tooltip>
                    </Marker>
                );
            })}
        </>
    );
});
