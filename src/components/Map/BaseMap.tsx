import type { MapContainerProps } from 'react-leaflet';

import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { useNavigationStore } from '../../stores/navigationStore';
import { useSettingsStore } from '../../stores/settingsStore';

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
  'dark-matter': {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  },
  osm: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://www.hotosm.org/">HOT</a>',
    // Use the HOT (Humanitarian) tile style which has slightly more detail
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  },
  positron: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
};

interface BaseMapProps extends MapContainerProps {
  children?: React.ReactNode;
  locationPanOffsetY?: number;
  userLocation?: null | { lat: number; lon: number };
}

export function BaseMap({
  children,
  locationPanOffsetY = 0,
  userLocation,
  ...mapProps
}: BaseMapProps) {
  const theme = useSettingsStore((state) => state.theme);
  const detailedMap = useSettingsStore((state) => state.detailedMap);
  const mapCenter = useSettingsStore((state) => state.mapCenter);
  const mapZoom = useSettingsStore((state) => state.mapZoom);

  const providerId: keyof typeof TILE_PROVIDERS = detailedMap
    ? 'osm'
    : theme === 'dark'
      ? 'dark-matter'
      : 'positron';
  const tileConfig = TILE_PROVIDERS[providerId];

  return (
    <MapContainer
      center={mapCenter}
      className="w-full h-full"
      maxZoom={18}
      minZoom={11}
      preferCanvas={false}
      style={{ height: '100%', width: '100%' }}
      zoom={mapZoom}
      zoomControl={false}
      {...mapProps}
    >
      <TileLayer
        attribution={tileConfig.attribution}
        keepBuffer={3}
        key={providerId}
        updateWhenIdle={true}
        url={tileConfig.url}
      />

      {userLocation && (
        <Marker
          icon={L.divIcon({
            className: 'user-location-icon',
            html: `<div data-testid="user-location-marker" class="user-location-marker"><span class="pulse"></span><span class="dot"></span></div>`,
            iconAnchor: [22, 22],
            iconSize: [44, 44],
          })}
          position={[userLocation.lat, userLocation.lon]}
        />
      )}

      <MapLocater panOffsetY={locationPanOffsetY} userLocation={userLocation} />
      <MapTestRef />
      <MapStateHandler />

      {children}
    </MapContainer>
  );
}

function MapLocater({
  panOffsetY = 0,
  userLocation,
}: {
  panOffsetY?: number;
  userLocation?: null | { lat: number; lon: number };
}) {
  const map = useMap();
  // Keep panOffsetY in a ref so changes to it don't re-trigger the fly.
  const panOffsetYRef = useRef(panOffsetY);
  // Sync the ref after every render (outside of render body to satisfy lint).
  useEffect(() => {
    panOffsetYRef.current = panOffsetY;
  });

  const locateTrigger = useNavigationStore((s) => s.locateTrigger);
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
  const setMapViewport = useSettingsStore((s) => s.setMapViewport);

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
    },
  });

  return null;
}
