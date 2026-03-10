/**
 * Nearby tab — geolocation-based nearest stops with live approaching vehicles.
 */

import { useState, useEffect, useMemo } from 'react';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import type { Stop, Route } from '../../utils/gtfs';
import { findNearestStops } from '../../utils/gtfs';
import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';

interface NearbyTabProps {
  stops: Stop[];
  stopsById: Map<string, Stop>;
  routesById: Map<string, Route>;
  onSelectStop: (stopId: string) => void;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} metara`;
  return `${km.toFixed(1)} km`;
}

/** Mini card for a nearby stop with live vehicle badges */
function NearbyStopCard({
  stop,
  distanceKm,
  stopsById,
  routesById,
  onSelect,
}: {
  stop: Stop;
  distanceKm: number;
  stopsById: Map<string, Stop>;
  routesById: Map<string, Route>;
  onSelect: () => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const { vehicles, loading } = useApproachingVehicles(stop.id, stopsById, routesById, nowMs);
  const upcoming = vehicles.filter((v) => v.confidence === 'realtime' && !v.passedStop).slice(0, 3);

  return (
    <button
      onClick={onSelect}
      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow w-full text-left"
    >
      <div className="card-body p-3 gap-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">{stop.name}</span>
          <span className="text-xs text-base-content/50 flex items-center gap-1 shrink-0">
            <Navigation className="w-3 h-3" />
            {formatDistance(distanceKm)}
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
                  key={v.tripId}
                  className="badge badge-sm gap-1 text-white"
                  style={{ backgroundColor: v.routeType === 0 ? '#2563eb' : '#d97706' }}
                >
                  {v.routeShortName}
                  <span className="opacity-80">{mins === 0 ? 'dolazi' : `${mins} min`}</span>
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-base-content/40 mt-1">Nema vozila u blizini</span>
        )}
      </div>
    </button>
  );
}

export function NearbyTab({ stops, stopsById, routesById, onSelectStop }: NearbyTabProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platformStops = useMemo(() => stops.filter((s) => s.locationType === 0), [stops]);

  const nearbyStops = useMemo(() => {
    if (!userLocation) return [];
    return findNearestStops(platformStops, userLocation.lat, userLocation.lon, 15);
  }, [userLocation, platformStops]);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError('Geolokacija nije dostupna u ovom pregledniku.');
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
        setError('Lokacija nije dostupna. Provjerite dozvole preglednika.');
        setLocating(false);
        setTimeout(() => setError(null), 4000);
      },
      { timeout: 8000, maximumAge: 30000 }
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
        <p className="text-lg font-semibold text-base-content/60">Stanice u blizini</p>
        <p className="text-sm text-base-content/40 mt-1 mb-4">
          Dopustite pristup lokaciji za prikaz najbližih stanica
        </p>
        <button onClick={handleLocate} className="btn btn-primary btn-sm gap-2">
          <LocateFixed className="w-4 h-4" />
          Pronađi moju lokaciju
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2 pb-24">
      {/* Locate button + status */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-base-content/50 px-1">
          Najbliže stanice
        </h3>
        <button
          onClick={handleLocate}
          disabled={locating}
          className="btn btn-ghost btn-xs gap-1"
        >
          {locating ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <LocateFixed className="w-3.5 h-3.5" />
          )}
          Osvježi
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
            key={ns.id}
            stop={ns}
            distanceKm={ns.distance}
            stopsById={stopsById}
            routesById={routesById}
            onSelect={() => onSelectStop(ns.id)}
          />
        ))}
      </div>
    </div>
  );
}
