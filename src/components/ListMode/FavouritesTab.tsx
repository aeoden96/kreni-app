/**
 * Favourites tab — shows favourite stops with live approaching vehicles,
 * and favourite routes at a glance.
 */

import { ChevronRight, Clock, MapPin, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../utils/gtfs';

import { useApproachingVehicles } from '../../hooks/useApproachingVehicles';
import { useSettingsStore } from '../../stores/settingsStore';
import { isRouteTypeTram } from '../../utils/gtfs';

interface FavouritesTabProps {
  onSelectRoute: (routeId: string, routeType: number) => void;
  onSelectStop: (stopId: string) => void;
  routesById: Map<string, Route>;
  stopsById: Map<string, Stop>;
}

export function FavouritesTab({
  onSelectRoute,
  onSelectStop,
  routesById,
  stopsById,
}: FavouritesTabProps) {
  const { t } = useTranslation();
  const { favouriteRouteIds, favouriteStopIds, recentRoutes, recentStops } = useSettingsStore();

  const favStops = useMemo(
    () => favouriteStopIds.map((id) => stopsById.get(id)).filter((s): s is Stop => !!s),
    [favouriteStopIds, stopsById]
  );

  const favRoutes = useMemo(
    () => favouriteRouteIds.map((id) => routesById.get(id)).filter((r): r is Route => !!r),
    [favouriteRouteIds, routesById]
  );

  const recentStopItems = useMemo(
    () =>
      recentStops
        .slice(0, 5)
        .map((r) => stopsById.get(r.id))
        .filter((s): s is Stop => !!s),
    [recentStops, stopsById]
  );

  const recentRouteItems = useMemo(
    () =>
      recentRoutes
        .slice(0, 5)
        .map((r) => routesById.get(r.id))
        .filter((r): r is Route => !!r),
    [recentRoutes, routesById]
  );

  const isEmpty =
    favStops.length === 0 &&
    favRoutes.length === 0 &&
    recentStopItems.length === 0 &&
    recentRouteItems.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center min-h-[50vh]">
        <Star className="w-12 h-12 text-base-content/20 mb-4" />
        <p className="text-lg font-semibold text-base-content/60">
          {t('favouritesTab.noFavourites')}
        </p>
        <p className="text-sm text-base-content/40 mt-1 max-w-xs">{t('favouritesTab.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 pb-24">
      {/* Favourite stops with live data */}
      {favStops.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> {t('favouritesTab.favouriteStops')}
          </h3>
          <div className="space-y-2">
            {favStops.map((stop) => (
              <FavouriteStopCard
                key={stop.id}
                onSelect={() => onSelectStop(stop.id)}
                routesById={routesById}
                stop={stop}
                stopsById={stopsById}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favourite routes */}
      {favRoutes.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5" /> {t('favouritesTab.favouriteRoutes')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {favRoutes.map((route) => (
              <button
                className={`btn btn-sm gap-1 ${
                  isRouteTypeTram(route.type) ? 'btn-primary' : 'btn-warning'
                }`}
                key={route.id}
                onClick={() => onSelectRoute(route.id, route.type)}
              >
                {route.shortName}
                <span className="opacity-70 text-xs truncate max-w-24">{route.longName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent stops */}
      {recentStopItems.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {t('favouritesTab.recentStops')}
          </h3>
          <div className="space-y-1">
            {recentStopItems.map((stop) => (
              <button
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-base-200 transition-colors text-left"
                key={stop.id}
                onClick={() => onSelectStop(stop.id)}
              >
                <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
                <span className="text-sm truncate">{stop.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent routes */}
      {recentRouteItems.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-base-content/50 mb-2 px-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {t('favouritesTab.recentRoutes')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {recentRouteItems.map((route) => (
              <button
                className={`badge badge-lg font-bold gap-1 cursor-pointer hover:opacity-80 transition-opacity text-white`}
                key={route.id}
                onClick={() => onSelectRoute(route.id, route.type)}
                style={{ backgroundColor: isRouteTypeTram(route.type) ? '#2563eb' : '#d97706' }}
              >
                {route.shortName}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/** Mini card showing live vehicles for a single favourite stop */
function FavouriteStopCard({
  onSelect,
  routesById,
  stop,
  stopsById,
}: {
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
          <ChevronRight className="w-4 h-4 text-base-content/40" />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="loading loading-dots loading-xs" />
            <span className="text-xs text-base-content/50">{t('favouritesTab.loading')}</span>
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
