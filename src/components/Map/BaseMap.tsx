import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import type { MapContainerProps } from 'react-leaflet';
import L from 'leaflet';
import { useSettingsStore } from '../../stores/settingsStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useEffect, useRef } from 'react';

/** Exposes the Leaflet map instance on window.__leafletMap for E2E tests. */
function MapTestRef() {
    const map = useMap();
    useEffect(() => {
        if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
            (window as unknown as Record<string, unknown>).__leafletMap = map;
        }
        return () => {
            if ((window as unknown as Record<string, unknown>).__leafletMap === map) {
                delete (window as unknown as Record<string, unknown>).__leafletMap;
            }
        };
    }, [map]);
    return null;
}


const TILE_PROVIDERS = {
    osm: {
        // Use the HOT (Humanitarian) tile style which has slightly more detail
        url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.hotosm.org/">HOT</a>'
    },
    positron: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    },
    'dark-matter': {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
};

interface BaseMapProps extends MapContainerProps {
    children?: React.ReactNode;
    userLocation?: { lat: number; lon: number } | null;
    locationPanOffsetY?: number;
}

function MapLocater({ userLocation, panOffsetY = 0 }: { userLocation?: { lat: number; lon: number } | null; panOffsetY?: number }) {
    const map = useMap();
    // Keep panOffsetY in a ref so changes to it don't re-trigger the fly.
    const panOffsetYRef = useRef(panOffsetY);
    // Sync the ref after every render (outside of render body to satisfy lint).
    useEffect(() => { panOffsetYRef.current = panOffsetY; });

    const locateTrigger = useNavigationStore(s => s.locateTrigger);
    const lastTriggerRef = useRef(0);

    useEffect(() => {
        if (userLocation && locateTrigger > lastTriggerRef.current) {
            lastTriggerRef.current = locateTrigger;
            const zoom = 16;
            const offsetY = panOffsetYRef.current;
            if (offsetY !== 0) {
                // Pre-shift the fly target so the location marker lands in the
                // upper centre once the bottom sheet is visible — single animation.
                const point = map.project([userLocation.lat, userLocation.lon], zoom);
                const adjusted = map.unproject(L.point(point.x, point.y + offsetY), zoom);
                map.flyTo(adjusted, zoom, { duration: 1.5 });
            } else {
                map.flyTo([userLocation.lat, userLocation.lon], zoom, { duration: 1.5 });
            }
        }
        // panOffsetY intentionally omitted from deps — read via ref to avoid re-flying when modal closes.
    }, [userLocation, map, locateTrigger]);
    return null;
}

function MapStateHandler() {
    const setMapViewport = useSettingsStore(s => s.setMapViewport);

    useMapEvents({
        moveend: (e) => {
            const map = e.target;
            const center = map.getCenter();
            setMapViewport([center.lat, center.lng], map.getZoom());
        },
        zoomend: (e) => {
            const map = e.target;
            const center = map.getCenter();
            setMapViewport([center.lat, center.lng], map.getZoom());
        }
    });

    return null;
}

export function BaseMap({ children, userLocation, locationPanOffsetY = 0, ...mapProps }: BaseMapProps) {
    const theme = useSettingsStore((state) => state.theme);
    const detailedMap = useSettingsStore((state) => state.detailedMap);
    const mapCenter = useSettingsStore((state) => state.mapCenter);
    const mapZoom = useSettingsStore((state) => state.mapZoom);

    const providerId: keyof typeof TILE_PROVIDERS = detailedMap
        ? 'osm'
        : (theme === 'dark' ? 'dark-matter' : 'positron');
    const tileConfig = TILE_PROVIDERS[providerId];

    return (
        <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            minZoom={11}
            maxZoom={18}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            {...mapProps}
        >
            <TileLayer
                key={providerId}
                attribution={tileConfig.attribution}
                url={tileConfig.url}
            />

            {userLocation && (
                <Marker
                    position={[userLocation.lat, userLocation.lon]}
                    icon={L.divIcon({
                        html: `<div data-testid="user-location-marker" class="user-location-marker"><span class="pulse"></span><span class="dot"></span></div>`,
                        className: 'user-location-icon',
                        iconSize: [44, 44],
                        iconAnchor: [22, 22],
                    })}
                />
            )}

            <MapLocater userLocation={userLocation} panOffsetY={locationPanOffsetY} />
            <MapTestRef />
            <MapStateHandler />

            {children}
        </MapContainer>
    );
}
