import { useEffect, useState } from 'react';

import type { FeedStatistics } from '../utils/realtime';

/**
 * Manages the two ticker effects that display human-readable freshness strings
 * for the GTFS-RT feed: "X ago" (time since app received feed) and feed age.
 *
 * Owns two 1 s intervals, so it must live in the leaf component that displays
 * these strings — keep it out of high-level containers (e.g. the page/map
 * shell), where the per-second state updates would needlessly re-render the
 * whole subtree, including the map.
 */
export function useRealtimeFreshness(
  hasRealtime: boolean,
  lastUpdate: null | number,
  realtimeStats: FeedStatistics | null
): { feedAgeStr: string; timeAgoStr: string } {
  const [timeAgoStr, setTimeAgoStr] = useState<string>('');
  const [feedAgeStr, setFeedAgeStr] = useState<string>('');

  useEffect(() => {
    if (!hasRealtime || !lastUpdate) {
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
  }, [hasRealtime, lastUpdate]);

  useEffect(() => {
    if (!hasRealtime || !realtimeStats?.lastUpdate) {
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
  }, [hasRealtime, realtimeStats?.lastUpdate]);

  return { feedAgeStr, timeAgoStr };
}
