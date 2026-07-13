/**
 * Debug context for time override
 */

import { createContext, type ReactNode, useEffect, useState } from 'react';

interface DebugContextType {
  debugTime: null | number; // minutes from midnight, null = use real time
  isDebugMode: boolean;
  isPlaying: boolean;
  setDebugMode: (enabled: boolean) => void;
  setDebugTime: (minutes: null | number) => void;
  setIsPlaying: (playing: boolean) => void;
  timeSpeed: number; // minutes per second
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);
export { DebugContext };

const TIME_SPEED = 0.3; // 0.3 minutes per second

export function DebugProvider({ children }: { children: ReactNode }) {
  const [debugTime, setDebugTime] = useState<null | number>(null);
  const [isDebugMode, setDebugMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseTime, setBaseTime] = useState<number>(0); // Base time in minutes
  const [baseTimestamp, setBaseTimestamp] = useState<number>(() => Date.now()); // Base timestamp in ms

  // Set base time and timestamp when debug time is manually set
  const handleSetDebugTime = (minutes: null | number) => {
    setDebugTime(minutes);
    if (minutes !== null) {
      setBaseTime(minutes);
      setBaseTimestamp(Date.now());
    }
  };

  // Smooth time progression
  useEffect(() => {
    if (isDebugMode && isPlaying && debugTime !== null) {
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = (now - baseTimestamp) / 1000;
        const elapsedMinutes = elapsedSeconds * TIME_SPEED;
        const newTime = (baseTime + elapsedMinutes) % 1440; // Wrap at midnight
        setDebugTime(newTime);
      }, 50); // Update every 50ms for smooth transitions

      return () => clearInterval(interval);
    }
  }, [isDebugMode, isPlaying, baseTime, baseTimestamp, debugTime]);

  // Update base time and timestamp when play state changes
  useEffect(() => {
    if (isPlaying && debugTime !== null) {
      setBaseTime(debugTime);
      setBaseTimestamp(Date.now());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  return (
    <DebugContext.Provider
      value={{
        debugTime,
        isDebugMode,
        isPlaying,
        setDebugMode,
        setDebugTime: handleSetDebugTime,
        setIsPlaying,
        timeSpeed: TIME_SPEED,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}
