import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route, Stop } from '../utils/gtfs';
import type { AllVehiclePosition } from '../utils/vehicles';

import { useGTFSMode } from '../contexts/GTFSModeContext';
import { useSettingsStore } from '../stores/settingsStore';
import { trackEvent } from '../utils/analytics';
import { filterParentStops } from '../utils/searchUtils';
import { useDirections } from './useDirections';

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

export function useDirectionsModal({
  isOpen,
  onClose,
  onSelectRoute,
  routes,
  stops,
  stopsById,
  vehicles,
}: DirectionsModalProps) {
  const { t } = useTranslation();
  const config = useGTFSMode();

  const [dirFromStop, setDirFromStop] = useState<null | Stop>(null);
  const [dirToStop, setDirToStop] = useState<null | Stop>(null);
  const [dirActiveField, setDirActiveField] = useState<'from' | 'to'>('from');
  const [fromQuery, setFromQuery] = useState('');
  const [dirToQuery, setDirToQuery] = useState('');
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const { favouriteStopIds } = useSettingsStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => fromInputRef.current?.focus(), 100);
    } else {
      setDirFromStop(null);
      setDirToStop(null);
      setDirActiveField('from');
      setFromQuery('');
      setDirToQuery('');
    }
  }, [isOpen]);

  const routesById = useMemo(() => new Map(routes.map((r) => [r.id, r])), [routes]);

  const platformStops = useMemo(() => stops.filter((s) => s.locationType === 0), [stops]);

  const parentStops = useMemo(() => {
    const canonicalParentIds = new Set(
      platformStops.map((s) => s.parentStation).filter((id): id is string => id != null)
    );
    return stops
      .filter((s) => s.locationType === 1 && canonicalParentIds.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stops, platformStops]);

  const favStops = useMemo(
    () => favouriteStopIds.map((id) => stopsById.get(id)).filter((s): s is Stop => s !== undefined),
    [favouriteStopIds, stopsById]
  );

  const filteredDirStops = useMemo(() => {
    const query = dirActiveField === 'from' ? fromQuery : dirToQuery;
    return filterParentStops(parentStops, query);
  }, [dirActiveField, fromQuery, dirToQuery, parentStops]);

  const { loading: dirLoading, results: dirResults } = useDirections(
    dirFromStop?.id ?? null,
    dirToStop?.id ?? null,
    routesById,
    { dataDir: config.dataDir }
  );

  const dirResultLabel = useMemo(() => {
    if (!dirFromStop || !dirToStop) return '';
    if (dirLoading) return t('search.searchingDirectRoutes');
    if (dirResults.length === 0) return t('search.noDirectRoutes');
    if (dirResults.length === 1) return t('search.directRoutesSingle');
    return t('search.directRoutesMany', { count: dirResults.length });
  }, [dirFromStop, dirToStop, dirLoading, dirResults.length, t]);

  const handleDirStopSelect = (stop: Stop) => {
    if (dirActiveField === 'from') {
      setDirFromStop(stop);
      setFromQuery('');
      if (!dirToStop) {
        setDirActiveField('to');
        setTimeout(() => toInputRef.current?.focus(), 50);
      }
    } else {
      setDirToStop(stop);
      setDirToQuery('');
      if (!dirFromStop) {
        setDirActiveField('from');
        setTimeout(() => fromInputRef.current?.focus(), 50);
      }
    }
  };

  const handleDirSwap = () => {
    const newFrom = dirToStop;
    const newTo = dirFromStop;
    setDirFromStop(newFrom);
    setDirToStop(newTo);
    setFromQuery(newFrom ? '' : dirToQuery);
    setDirToQuery(newTo ? '' : fromQuery);
  };

  const handleSelectDirectionsRoute = (
    routeId: string,
    routeType: number,
    direction: 'A' | 'B',
    tripId?: null | string
  ) => {
    trackEvent('directions_route_selected', { direction, route_id: routeId });
    onSelectRoute(
      routeId,
      routeType,
      direction,
      tripId ?? null,
      dirFromStop?.id ?? null,
      dirToStop?.id ?? null
    );
    onClose();
  };

  return {
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
  };
}
