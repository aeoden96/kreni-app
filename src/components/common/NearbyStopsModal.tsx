/**
 * Modal showing nearest stops to the user's current GPS location.
 */

import type { TFunction } from 'i18next';

import { ChevronDown, ChevronUp, MapPin, Navigation, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { Stop } from '../../utils/gtfs';

import { findNearestStops } from '../../utils/gtfs';
import { compassLabelForBearing } from '../../utils/localizedCompass';

interface NearbyStopsModalProps {
  isOpen: boolean;
  listExpanded: boolean;
  onClose: () => void;
  onListExpandedChange: (expanded: boolean) => void;
  onSelectStop: (stopId: string) => void;
  /** Platform stops only (locationType === 0) to search against */
  stops: Stop[];
  userLat: number;
  userLon: number;
}

export function NearbyStopsModal({
  isOpen,
  listExpanded,
  onClose,
  onListExpandedChange,
  onSelectStop,
  stops,
  userLat,
  userLon,
}: NearbyStopsModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // findNearestStops returns platform stops sorted by distance (km)
  const nearby = findNearestStops(stops, userLat, userLon, 15);

  // Deduplicate by stop name — show unique named stops only (closest platform per name)
  const seen = new Set<string>();
  const unique = nearby.filter((s) => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  const listSlice = unique.slice(0, 12);
  const stopCount = listSlice.length;

  return (
    <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top))] left-2 right-2 sm:top-[calc(5rem+env(safe-area-inset-top))] sm:left-4 sm:right-auto sm:w-auto sm:max-w-sm z-[1050]">
      {/* Compact card — top overlay on mobile, top-left card on desktop */}
      <div
        className={`relative w-full bg-base-100 rounded-xl shadow-2xl flex flex-col overflow-hidden ${
          listExpanded ? 'max-h-[35vh] sm:max-h-[50vh]' : ''
        }`}
        style={{ animation: 'modal-fade-in 0.18s ease-out' }}
      >
        {/* Header */}
        <div className={`p-4 ${listExpanded ? 'border-b border-base-300' : ''}`}>
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-lg font-bold flex-1 min-w-0">{t('nearbyStops.title')}</h2>
            <button
              aria-expanded={listExpanded}
              aria-label={
                listExpanded ? t('nearbyStops.collapseList') : t('nearbyStops.expandList')
              }
              className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
              onClick={() => onListExpandedChange(!listExpanded)}
              type="button"
            >
              {listExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
            <button
              aria-label={t('common.close')}
              className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
              onClick={onClose}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-base-content/60 mt-1 ml-8">
            {listExpanded
              ? t('nearbyStops.subtitle')
              : stopCount === 0
                ? t('nearbyStops.empty')
                : t('nearbyStops.collapsedHint', { count: stopCount })}
          </p>
        </div>

        {/* Stop list */}
        {listExpanded && (
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            {unique.length === 0 ? (
              <div className="p-8 text-center text-base-content/50">{t('nearbyStops.empty')}</div>
            ) : (
              <div className="divide-y divide-base-300">
                {listSlice.map((stop) => (
                  <button
                    className="w-full py-3 px-4 text-left hover:bg-base-200 active:bg-base-300 transition-colors min-h-[56px] flex items-center gap-3"
                    key={stop.id}
                    onClick={() => {
                      onSelectStop(stop.id);
                      onClose();
                    }}
                    type="button"
                  >
                    <MapPin className="w-4 h-4 text-base-content/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{stop.name}</div>
                      {stop.bearing !== undefined && (
                        <div className="text-xs text-base-content/50">
                          {t('search.headingTowards', {
                            place: compassLabelForBearing(stop.bearing, t),
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-primary shrink-0">
                      {formatDistanceKm(stop.distance, t)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDistanceKm(km: number, t: TFunction): string {
  if (km < 1) return t('nearbyStops.distanceMeters', { meters: Math.round(km * 1000) });
  return t('nearbyStops.distanceKm', { km: km.toFixed(1) });
}
