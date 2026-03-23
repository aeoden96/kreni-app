import { useEffect, useState } from 'react';

import type { GTFSModeConfig } from '../config/modes';
import type { FeedStatistics } from '../utils/realtime';

/**
 * Manages the two ticker effects that display human-readable freshness strings
 * for the GTFS-RT feed: "X ago" (time since app received feed) and feed age.
 */
export function useRealtimeFreshness(
  config: GTFSModeConfig,
  lastUpdate: null | number,
  realtimeStats: FeedStatistics | null
): { feedAgeStr: string; timeAgoStr: string } {
  const [timeAgoStr, setTimeAgoStr] = useState<string>('');
  const [feedAgeStr, setFeedAgeStr] = useState<string>('');

  useEffect(() => {
    if (!config.hasRealtime || !lastUpdate) {
      setTimeAgoStr('');
      return;
    }
    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastUpdate) / 1000);
      setTimeAgoStr(seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`);
    };
    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [config.hasRealtime, lastUpdate]);

  useEffect(() => {
    if (!config.hasRealtime || !realtimeStats?.lastUpdate) {
      setFeedAgeStr('');
      return;
    }
    const updateFeedAge = () => {
      const ms = Date.now() - realtimeStats.lastUpdate!.getTime();
      if (ms < 1000) setFeedAgeStr(`${ms} ms`);
      else if (ms < 60000) setFeedAgeStr(`${Math.floor(ms / 1000)} s`);
      else setFeedAgeStr(`${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`);
    };
    updateFeedAge();
    const interval = setInterval(updateFeedAge, 1000);
    return () => clearInterval(interval);
  }, [config.hasRealtime, realtimeStats?.lastUpdate]);

  return { feedAgeStr, timeAgoStr };
}
