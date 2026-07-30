/**
 * Hook for getting the current service ID based on today's date
 */

import { useEffect, useState } from 'react';

import { getCurrentServiceId } from '../utils/gtfs';

export function useCurrentService(calendar: Record<string, string>) {
  const [serviceId, setServiceId] = useState<null | string>(() => getCurrentServiceId(calendar));

  useEffect(() => {
    // Returning `prev` unchanged is what makes this safe to call from a commit:
    // a caller whose `calendar` identity is unstable re-runs this effect on every
    // render, and an unconditional setState there trips React's nested-update
    // limit even when the value never actually changes — which blanked the
    // transit page on remount. React drops an update that is Object.is-equal.
    const sync = () =>
      setServiceId((prev) => {
        const next = getCurrentServiceId(calendar);
        return next === prev ? prev : next;
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

  return serviceId;
}
