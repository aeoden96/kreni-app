/**
 * Hook for getting current time with debug override support
 */

import { getCurrentTimeMinutes } from '../utils/gtfs';
import { useDebug } from './useDebug';

export function useCurrentTime() {
  const { debugTime, isDebugMode } = useDebug();

  // Return debug time if in debug mode, otherwise real time
  return isDebugMode && debugTime !== null ? debugTime : getCurrentTimeMinutes();
}
