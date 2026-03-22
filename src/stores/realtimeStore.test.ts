import { beforeEach, vi, expect, it } from 'vitest';
import { useRealtimeStore } from './realtimeStore';

vi.mock('../utils/realtime', async () => {
  const original: any = await vi.importActual('../utils/realtime');
  return {
    ...original,
    fetchRealtimeFeed: vi.fn(),
    parseVehiclePositions: vi.fn(() => []),
    parseTripUpdates: vi.fn(() => []),
    parseServiceAlerts: vi.fn(() => []),
    getFeedStatistics: vi.fn(() => ({
      totalEntities: 0,
      vehiclePositions: 0,
      tripUpdates: 0,
      serviceAlerts: 0,
      lastUpdate: new Date(0),
    })),
    enrichWithDeadReckoning: vi.fn((p: any) => p),
  };
});

beforeEach(() => {
  // Reset the store between tests
  useRealtimeStore.getState().clear();
  vi.clearAllMocks();
});

it('propagates worker metadata from fetchRealtimeFeed to the store', async () => {
  const { fetchRealtimeFeed } = await import('../utils/realtime') as any;

  fetchRealtimeFeed
    .mockResolvedValueOnce({
      feed: { entity: [], header: { timestamp: 0 } },
      metadata: {
        workerTimestamp: '2026-03-14T20:45:10Z',
        cacheStatus: 'HIT',
        cacheAgeSeconds: 4,
        fetchTimeMs: 123,
        httpStatus: 200,
      },
    })
    .mockResolvedValueOnce({
      feed: { entity: [], header: { timestamp: 0 } },
      metadata: {
        workerTimestamp: null,
        cacheStatus: null,
        cacheAgeSeconds: null,
        fetchTimeMs: 98,
        httpStatus: 200,
      },
    });

  await useRealtimeStore.getState().fetchAll();

  const state = useRealtimeStore.getState();
  expect(state.workerTimestamp).toBe('2026-03-14T20:45:10Z');
  expect(state.cacheStatus).toBe('HIT');
  expect(state.cacheAgeSeconds).toBe(4);
  expect(state.fetchLatencyMs).toBe(123);
  expect(typeof state.lastUpdate).toBe('number');
  expect(state.stats).not.toBeNull();
});
