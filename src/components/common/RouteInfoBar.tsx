/**
 * Fixed route info bar — compact "small view" for a selected route.
 * Mirrors the StopInfoBar pattern: appears below the search bar,
 * can be expanded into the full RouteModal via the Maximize2 button.
 */

import { Maximize2, X, Train, Bus, Star, Navigation } from 'lucide-react';
import type { Route, Stop } from '../../utils/gtfs';
import type { VehiclePosition } from '../../utils/vehicles';
import { getDirectionColor } from '../Map/directionColors';
import { useSettingsStore } from '../../stores/settingsStore';

interface RouteInfoBarProps {
  route: Route;
  vehicles: VehiclePosition[];
  onExpand: () => void;
  onClose: () => void;
  orderedStops?: Record<string, string[]>;
  stopsById?: Map<string, Stop>;
  /** tripId of the last-clicked vehicle — enables the follow button */
  followCandidateTripId?: string | null;
  /** Called with the tripId to activate follow mode */
  onFollowStart?: (tripId: string) => void;
}

const TRAM_COLOR = '#2563eb'; // blue-600
const BUS_COLOR = '#d97706'; // amber-600

export function RouteInfoBar({ route, vehicles, onExpand, onClose, orderedStops, stopsById, followCandidateTripId, onFollowStart }: RouteInfoBarProps) {
  const color = route.type === 0 ? TRAM_COLOR : BUS_COLOR;
  const isTram = route.type === 0;
  const { favouriteRouteIds, toggleFavouriteRoute } = useSettingsStore();
  const isFav = favouriteRouteIds.includes(route.id);

  // Group vehicles by direction
  const vehiclesByDirection: Record<string, VehiclePosition[]> = {};
  if (orderedStops) {
    Object.keys(orderedStops).forEach((dir) => {
      vehiclesByDirection[dir] = vehicles.filter((v) => String(v.direction) === dir);
    });
  }

  return (
    <div
      className="fixed top-16 sm:top-20 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-md z-[1050] bg-base-100 rounded-xl shadow-2xl"
      style={{ animation: 'modal-fade-in 0.2s ease-out' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {/* Route badge */}
            <span
              className="badge font-bold text-white shrink-0 min-w-[2.5rem] justify-center"
              style={{ backgroundColor: color, borderColor: color }}
            >
              {route.shortName}
            </span>
            {/* Route name */}
            <h3 className="font-bold text-base leading-tight text-base-content truncate">
              {route.longName}
            </h3>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleFavouriteRoute(route.id)}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title={isFav ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
            >
              <Star
                className="w-4 h-4"
                fill={isFav ? 'currentColor' : 'none'}
                color={isFav ? '#f59e0b' : 'currentColor'}
              />
            </button>
            {followCandidateTripId && onFollowStart && (
              <button
                onClick={() => onFollowStart(followCandidateTripId)}
                className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
                title="Prati ovo vozilo"
              >
                <Navigation className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onExpand}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title="Prikaži detalje rute"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-circle btn-xs min-h-[32px] min-w-[32px]"
              title="Zatvori"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vehicle status per direction */}
        {orderedStops && stopsById ? (
          <div className="flex items-center gap-3 text-xs flex-wrap">
            {isTram ? (
              <Train className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            ) : (
              <Bus className="w-3.5 h-3.5 shrink-0 text-base-content/50" />
            )}
            {Object.keys(orderedStops).sort((a, b) => Number(a) - Number(b)).map((dir, idx) => {
              const count = vehiclesByDirection[dir]?.length || 0;
              const ids = orderedStops[dir] || [];
              const endId = ids[ids.length - 1] || ids[0] || null;
              const stopName = endId ? (stopsById.get(endId)?.name || endId) : '—';
              const active = count > 0;
              return (
                <span key={dir} className="flex items-center gap-1">
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: getDirectionColor(route.type, idx),
                    flexShrink: 0,
                  }} />
                  <span className="text-base-content/70 truncate max-w-[110px]">{stopName}</span>
                  <span className={active ? 'font-semibold text-success' : 'text-base-content/40'}>{count}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />}
                </span>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-base-content/60">
            {isTram ? (
              <Train className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Bus className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>Nema aktivnih vozila</span>
          </div>
        )}
      </div>
    </div>
  );
}
