import { beforeEach, expect, it, vi } from 'vitest';

import { useRealtimeStore } from './realtimeStore';

vi.mock('../utils/realtime', async () => {
  const original: any = await vi.importActual('../utils/realtime');
  return {
    ...original,
    enrichWithDeadReckoning: vi.fn((p: any) => p),
    fetchRealtimeFeed: vi.fn(),
    getFeedStatistics: vi.fn(() => ({
      lastUpdate: new Date(0),
      serviceAlerts: 0,
      totalEntities: 0,
      tripUpdates: 0,
      vehiclePositions: 0,
    })),
    parseServiceAlerts: vi.fn(() => []),
    parseTripUpdates: vi.fn(() => []),
    parseVehiclePositions: vi.fn(() => []),
  };
});

beforeEach(() => {
  // Reset the store between tests
  useRealtimeStore.getState().clear();
  vi.clearAllMocks();
});

it('propagates worker metadata from fetchRealtimeFeed to the store', async () => {
  const { fetchRealtimeFeed, REALTIME_COMBINED_FEED_ENDPOINT } =
    (await import('../utils/realtime')) as any;

  fetchRealtimeFeed.mockResolvedValueOnce({
    feed: { entity: [], header: { timestamp: 0 } },
    metadata: {
      cacheAgeSeconds: 4,
      cacheStatus: 'HIT',
      fetchTimeMs: 123,
      httpStatus: 200,
      workerTimestamp: '2026-03-14T20:45:10Z',
    },
  });

  await useRealtimeStore.getState().fetchAll();

  expect(fetchRealtimeFeed).toHaveBeenCalledTimes(1);
  expect(fetchRealtimeFeed).toHaveBeenCalledWith(REALTIME_COMBINED_FEED_ENDPOINT);

  const state = useRealtimeStore.getState();
  expect(state.workerTimestamp).toBe('2026-03-14T20:45:10Z');
  expect(state.cacheStatus).toBe('HIT');
  expect(state.cacheAgeSeconds).toBe(4);
  expect(state.fetchLatencyMs).toBe(123);
  expect(typeof state.lastUpdate).toBe('number');
  expect(state.stats).not.toBeNull();
});
