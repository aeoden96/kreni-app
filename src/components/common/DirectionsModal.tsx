import { ArrowUpDown, MapPin, Search, Star, X } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../../utils/gtfs';
import type { AllVehiclePosition } from '../../utils/vehicles';

import { useDirectionsModal } from '../../hooks/useDirectionsModal';
import { DirectionsContent } from './search/DirectionsContent';
import { StopDropdown } from './search/StopDropdown';

interface DirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (
    routeId: string,
    routeType: number,
    directionFilter?: 'A' | 'B',
    tripId?: null | string,
    fromParentId?: null | string,
    toParentId?: null | string
  ) => void;
  routes: Route[];
  stops: Stop[];
  stopsById: Map<string, Stop>;
  vehicles: AllVehiclePosition[];
}

export const DirectionsModal = memo(function DirectionsModal(props: DirectionsModalProps) {
  const { t } = useTranslation();
  const {
    dirActiveField,
    dirFromStop,
    dirLoading,
    dirResultLabel,
    dirResults,
    dirToQuery,
    dirToStop,
    favStops,
    filteredDirStops,
    fromInputRef,
    fromQuery,
    handleDirStopSelect,
    handleDirSwap,
    handleSelectDirectionsRoute,
    setDirActiveField,
    setDirFromStop,
    setDirToQuery,
    setDirToStop,
    setFromQuery,
    toInputRef,
    vehicles,
  } = useDirectionsModal(props);

  const [fromFocused, setFromFocused] = useState(false);
  const [toFocused, setToFocused] = useState(false);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={props.onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-2 mt-2 sm:mt-8 max-h-[90svh] bg-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="p-4 border-b border-base-300">
          {/* Title row */}
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold flex-1">{t('search.planJourney')}</h2>
            <button
              className="btn btn-ghost btn-circle btn-sm min-h-[44px] min-w-[44px]"
              onClick={props.onClose}
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* From field */}
          <div>
            <p className="text-xs text-base-content/50 mb-1 px-1">{t('search.dirFromLabel')}</p>
            <div className="relative">
              {dirFromStop ? (
                <button
                  className="input input-bordered w-full min-h-[44px] flex items-center gap-2 px-3 pr-10 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={() => {
                    setDirFromStop(null);
                    setDirActiveField('from');
                    setTimeout(() => fromInputRef.current?.focus(), 50);
                  }}
                  type="button"
                >
                  <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                  <span className="flex-1 truncate">{dirFromStop.name}</span>
                  <X className="w-4 h-4 text-base-content/40 shrink-0" />
                </button>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                  <input
                    className={`input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base transition-shadow ${dirActiveField === 'from' ? 'ring-2 ring-primary/40' : ''}`}
                    onBlur={() => setTimeout(() => setFromFocused(false), 150)}
                    onChange={(e) => {
                      setFromQuery(e.target.value);
                      setDirActiveField('from');
                    }}
                    onFocus={() => {
                      setDirActiveField('from');
                      setFromFocused(true);
                    }}
                    placeholder={t('search.placeholder.fromWhere')}
                    ref={fromInputRef}
                    type="text"
                    value={fromQuery}
                  />
                  {fromQuery && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                      onClick={() => setFromQuery('')}
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center my-1">
            <button
              aria-label={t('search.swapStopsAria')}
              className="btn btn-ghost btn-xs btn-circle"
              disabled={!dirFromStop && !dirToStop}
              onClick={handleDirSwap}
              type="button"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* To field */}
          <div>
            <p className="text-xs text-base-content/50 mb-1 px-1">{t('search.dirToLabel')}</p>
            <div className="relative">
              {dirToStop ? (
                <button
                  className="input input-bordered w-full min-h-[44px] flex items-center gap-2 px-3 pr-10 text-sm text-left hover:bg-base-200 transition-colors"
                  onClick={() => {
                    setDirToStop(null);
                    setDirToQuery('');
                    setDirActiveField('to');
                    setTimeout(() => toInputRef.current?.focus(), 50);
                  }}
                  type="button"
                >
                  <MapPin className="w-4 h-4 text-primary/70 shrink-0" />
                  <span className="flex-1 truncate">{dirToStop.name}</span>
                  <X className="w-4 h-4 text-base-content/40 shrink-0" />
                </button>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
                  <input
                    className={`input input-bordered w-full pl-10 pr-10 min-h-[44px] text-base transition-shadow ${dirActiveField === 'to' ? 'ring-2 ring-primary/40' : ''}`}
                    onBlur={() => setTimeout(() => setToFocused(false), 150)}
                    onChange={(e) => {
                      setDirToQuery(e.target.value);
                      setDirActiveField('to');
                    }}
                    onFocus={() => {
                      setDirActiveField('to');
                      setToFocused(true);
                    }}
                    placeholder={t('search.placeholder.toWhere')}
                    ref={toInputRef}
                    type="text"
                    value={dirToQuery}
                  />
                  {dirToQuery && (
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content/80"
                      onClick={() => setDirToQuery('')}
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Favourite stops quick-select */}
          {favStops.length > 0 && !fromQuery && !dirToQuery && (
            <div className="mt-3">
              <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1.5">
                <Star className="w-3 h-3 fill-current text-warning" />
                <span>{t('search.favourites')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {favStops.map((stop) => (
                  <button
                    className="badge badge-outline badge-lg hover:badge-primary transition-colors cursor-pointer text-xs"
                    key={stop.id}
                    onClick={() => handleDirStopSelect(stop)}
                    type="button"
                  >
                    {stop.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <StopDropdown
          hasMore={filteredDirStops.hasMore}
          inputRef={fromInputRef}
          isOpen={fromFocused && !dirFromStop}
          onSelect={handleDirStopSelect}
          stops={filteredDirStops.stops}
        />
        <StopDropdown
          hasMore={filteredDirStops.hasMore}
          inputRef={toInputRef}
          isOpen={toFocused && !dirToStop}
          onSelect={handleDirStopSelect}
          stops={filteredDirStops.stops}
        />

        {/* Route results — only visible once both stops are selected */}
        {dirFromStop && dirToStop && (
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <DirectionsContent
              dirFromStop={dirFromStop}
              dirLoading={dirLoading}
              dirResultLabel={dirResultLabel}
              dirResults={dirResults}
              dirToStop={dirToStop}
              onSelectDirectionsRoute={handleSelectDirectionsRoute}
              stopsById={props.stopsById}
              vehicles={vehicles}
            />
          </div>
        )}
      </div>
    </div>
  );
});
