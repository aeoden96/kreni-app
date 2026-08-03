/**
 * Hook for getting the current service ID based on today's date
 */

import { useEffect, useState } from 'react';

import { getCurrentServiceId, getPreviousServiceId } from '../utils/gtfs';

interface CurrentService {
  /**
   * Yesterday's service. Trips running past midnight still belong to it, so
   * anything resolving a live vehicle against static data has to consider it —
   * see {@link createStaticTripResolver}.
   */
  previousServiceId: null | string;
  /** Today's service, e.g. `0_4`. */
  serviceId: null | string;
}

const read = (calendar: Record<string, string>): CurrentService => ({
  previousServiceId: getPreviousServiceId(calendar),
  serviceId: getCurrentServiceId(calendar),
});

export function useCurrentService(calendar: Record<string, string>): CurrentService {
  const [service, setService] = useState<CurrentService>(() => read(calendar));

  useEffect(() => {
    // Returning `prev` unchanged is what makes this safe to call from a commit:
    // a caller whose `calendar` identity is unstable re-runs this effect on every
    // render, and an unconditional setState there trips React's nested-update
    // limit even when the value never actually changes — which blanked the
    // transit page on remount. React drops an update that is Object.is-equal,
    // so the object identity has to be preserved too, not just the fields.
    const sync = () =>
      setService((prev) => {
        const next = read(calendar);
        return next.serviceId === prev.serviceId &&
          next.previousServiceId === prev.previousServiceId
          ? prev
          : next;
      });

    sync();

    // Check for date change at midnight
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      return setTimeout(() => {
        sync();
        // Recursively check for next midnight
        checkMidnight();
      }, msUntilMidnight);
    };

    const timeoutId = checkMidnight();

    return () => clearTimeout(timeoutId);
  }, [calendar]);

  return service;
}
