/**
 * Hook for getting current time with debug override support
 */

import { useDebug } from './useDebug';
import { getCurrentTimeMinutes } from '../utils/gtfs';

export function useCurrentTime() {
  const { debugTime, isDebugMode } = useDebug();
  
  // Return debug time if in debug mode, otherwise real time
  return isDebugMode && debugTime !== null ? debugTime : getCurrentTimeMinutes();
}
