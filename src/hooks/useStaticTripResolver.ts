/**
 * Realtime → static trip ID resolution, scoped to the services that are live now.
 *
 * Every consumer needs the same two things — the calendar's current and previous
 * service, and a keyed index of some static collection — so they are assembled
 * once here rather than threaded through the component tree. See
 * {@link createStaticTripResolver} for why the service scoping is mandatory.
 */

import { useMemo } from 'react';

import type { StaticTripResolver } from '../utils/staticTripResolver';

import { createStaticTripResolver } from '../utils/staticTripResolver';
import { useCurrentService } from './useCurrentService';
import { useInitialData } from './useInitialData';

interface UseStaticTripResolverOptions {
  /** Data directory the calendar comes from (default: 'data'). */
  dataDir?: string;
}

/**
 * @param staticTripIds Trip IDs of the static collection being searched. Pass a
 *   stable (memoized) array — a fresh one each render rebuilds the index on
 *   every realtime poll.
 */
export function useStaticTripResolver(
  staticTripIds: readonly string[],
  options: UseStaticTripResolverOptions = {}
): StaticTripResolver {
  const { dataDir = 'data' } = options;
  const { calendar } = useInitialData({ dataDir });
  const { previousServiceId, serviceId } = useCurrentService(calendar);

  return useMemo(
    () => createStaticTripResolver(staticTripIds, [serviceId, previousServiceId]),
    [staticTripIds, serviceId, previousServiceId]
  );
}
