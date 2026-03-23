/**
 * Nearby tab — geolocation-based nearest stops with live approaching vehicles.
 */

import type { TFunction } from 'i18next';

import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../utils/gtfs';

import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';
import { findNearestStops } from '../../utils/gtfs';

interface NearbyTabProps {
  onSelectStop: (stopId: string) => void;
  routesById: Map<string, Route>;
  stops: Stop[];
  stopsById: Map<string, Stop>;
}

export function NearbyTab({ onSelectStop, routesById, stops, stopsById }: NearbyTabProps) {
  const { t } = useTranslation();
  const [userLocation, setUserLocation] = useState<null | { lat: number; lon: number }>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<null | string>(null);

  const platformStops = useMemo(() => stops.filter((s) => s.locationType === 0), [stops]);

  const nearbyStops = useMemo(() => {
    if (!userLocation) return [];
    return findNearestStops(platformStops, userLocation.lat, userLocation.lon, 15);
  }, [userLocation, platformStops]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError(t('nearbyTab.geoNotSupported'));
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError(t('nearbyTab.geoPermissionDenied'));
        setLocating(false);
        setTimeout(() => setError(null), 4000);
      },
      { maximumAge: 30000, timeout: 8000 }
    );
  };

  // Auto-locate on mount
  useEffect(() => {
    if (!userLocation && !locating) handleLocate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userLocation && !locating && !error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <LocateFixed className="w-12 h-12 text-base-content/20 mb-4" />
        <p className="text-lg font-semibold text-base-content/60">{t('nearbyTab.emptyTitle')}</p>
        <p className="text-sm text-base-content/40 mt-1 mb-4">{t('nearbyTab.emptyHint')}</p>
        <button className="btn btn-primary btn-sm gap-2" onClick={handleLocate}>
          <LocateFixed className="w-4 h-4" />
          {t('nearbyTab.findMyLocation')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 pb-24">
      {/* Locate button + status */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-base-content/50 px-1">
          {t('nearbyTab.sectionTitle')}
        </h3>
        <button className="btn btn-ghost btn-xs gap-1" disabled={locating} onClick={handleLocate}>
          {locating ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          {t('nearbyTab.refresh')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error py-2 text-xs">
          <span>{error}</span>
        </div>
      )}

      {locating && nearbyStops.length === 0 && (
        <div className="flex items-center justify-center p-8">
          <span className="loading loading-spinner loading-md" />
        </div>
      )}

      <div className="space-y-2">
        {nearbyStops.map((ns) => (
          <NearbyStopCard
            distanceKm={ns.distance}
            key={ns.id}
            onSelect={() => onSelectStop(ns.id)}
            routesById={routesById}
            stop={ns}
            stopsById={stopsById}
          />
        ))}
      </div>
    </div>
  );
}

function formatDistanceKm(km: number, t: TFunction): string {
  if (km < 1) return t('nearbyStops.distanceMeters', { meters: Math.round(km * 1000) });
  return t('nearbyStops.distanceKm', { km: km.toFixed(1) });
}

/** Mini card for a nearby stop with live vehicle badges */
function NearbyStopCard({
  distanceKm,
  onSelect,
  routesById,
  stop,
  stopsById,
}: {
  distanceKm: number;
  onSelect: () => void;
  routesById: Map<string, Route>;
  stop: Stop;
  stopsById: Map<string, Stop>;
}) {
  const { t } = useTranslation();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const { loading, vehicles } = useApproachingVehicles(stop.id, stopsById, routesById, nowMs);
  const upcoming = vehicles.filter((v) => v.confidence === 'realtime' && !v.passedStop).slice(0, 3);

  return (
    <button
      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow w-full text-left"
      onClick={onSelect}
    >
      <div className="card-body p-3 gap-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">{stop.name}</span>
          <span className="text-xs text-base-content/50 flex items-center gap-1 shrink-0">
            <Navigation className="w-3 h-3" />
            {formatDistanceKm(distanceKm, t)}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="loading loading-dots loading-xs" />
          </div>
        ) : upcoming.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {upcoming.map((v) => {
              const mins = Math.max(0, Math.round(v.arrivingInSeconds / 60));
              return (
                <span
                  className="badge badge-sm gap-1 text-white"
                  key={v.tripId}
                  style={{ backgroundColor: v.routeType === 0 ? '#2563eb' : '#d97706' }}
                >
                  {v.routeShortName}
                  <span className="opacity-80">
                    {mins === 0
                      ? t('nearbyTab.arrivingNow')
                      : t('nearbyTab.minutes', { count: mins })}
                  </span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-base-content/40 mt-1">
            {t('nearbyTab.noVehiclesNearby')}
          </span>
        )}
      </div>
    </button>
  );
}
