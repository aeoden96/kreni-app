/**
 * useSelectionParams
 *
 * Bridges URL search params with selection state so that the current route /
 * stop selection is reflected in the URL and survives page reloads, forwards /
 * backwards navigation, and can be shared as a link.
 *
 * URL shape:
 *   ?route=<routeId>&stop=<stopId>&dir=A|B
 *
 * All params are optional and can be combined, e.g.
 *   ?route=5           – route 5 open
 *   ?stop=42           – stop 42 open
 *   ?route=5&stop=12   – route 5 open, stop 12 also pinned
 *   ?route=5&dir=B     – route 5, direction B
 *
 * The hook is the single source of truth for selection state; zustand keeps
 * its role for persisted settings (theme, favourites, recents).
 */

import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { hapticSelection } from '../utils/haptics';

export type DirectionFilter = 'A' | 'B';

interface SelectionParams {
  /** Clear all selection params. */
  clearAll: () => void;
  /** Clear the selected route (and direction). */
  clearRoute: () => void;
  /** Clear the selected stop. */
  clearStop: () => void;

  /** Current direction filter for the selected route */
  directionFilter: DirectionFilter;
  /** Currently selected route ID (null = none) */
  selectedRouteId: null | string;
  /** Currently selected stop ID (null = none) */
  selectedStopId: null | string;
  /** Select a route. Clears stop by default unless keepStop is true. */
  selectRoute: (routeId: string, opts?: { dir?: DirectionFilter; keepStop?: boolean }) => void;
  /** Select (or replace) the current stop. */
  selectStop: (stopId: string) => void;
  /** Update only the direction filter. */
  setDirectionFilter: (dir: DirectionFilter) => void;
}

export function useSelectionParams(): SelectionParams {
  const [params, setParams] = useSearchParams();

  const selectedRouteId = params.get('route');
  const selectedStopId = params.get('stop');
  const directionFilter = (params.get('dir') as DirectionFilter | null) ?? 'A';

  const selectRoute = useCallback(
    (routeId: string, opts: { dir?: DirectionFilter; keepStop?: boolean } = {}) => {
      hapticSelection();
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('route', routeId);
          next.set('dir', opts.dir ?? 'A');
          if (!opts.keepStop) next.delete('stop');
          return next;
        },
        { replace: false }
      );
    },
    [setParams]
  );

  const clearRoute = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('route');
        next.delete('dir');
        return next;
      },
      { replace: false }
    );
  }, [setParams]);

  const selectStop = useCallback(
    (stopId: string) => {
      hapticSelection();
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('stop', stopId);
          return next;
        },
        { replace: false }
      );
    },
    [setParams]
  );

  const clearStop = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('stop');
        return next;
      },
      { replace: false }
    );
  }, [setParams]);

  const clearAll = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('route');
        next.delete('stop');
        next.delete('dir');
        return next;
      },
      { replace: false }
    );
  }, [setParams]);

  const setDirectionFilter = useCallback(
    (dir: DirectionFilter) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('dir', dir);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return {
    clearAll,
    clearRoute,
    clearStop,
    directionFilter,
    selectedRouteId,
    selectedStopId,
    selectRoute,
    selectStop,
    setDirectionFilter,
  };
}
