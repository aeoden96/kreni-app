/**
 * Hook for getting the current service ID based on today's date
 */

import { useState, useEffect } from 'react';
import { getCurrentServiceId } from '../utils/gtfs';

export function useCurrentService(calendar: Record<string, string>) {
  const [serviceId, setServiceId] = useState<string | null>(() => 
    getCurrentServiceId(calendar)
  );

  useEffect(() => {
    // Update service ID immediately
    setServiceId(getCurrentServiceId(calendar));

    // Check for date change at midnight
    const checkMidnight = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        setServiceId(getCurrentServiceId(calendar));
        // Recursively check for next midnight
        checkMidnight();
      }, msUntilMidnight);
    };

    const timeoutId = checkMidnight();

    return () => clearTimeout(timeoutId);
  }, [calendar]);

  return serviceId;
}
