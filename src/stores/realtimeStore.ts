/**
 * Zustand store for GTFS Realtime data.
 * Not persisted — realtime data is ephemeral by nature.
 */

import { create } from 'zustand';
import {
  fetchRealtimeFeed,
  parseVehiclePositions,
  parseTripUpdates,
  parseServiceAlerts,
  getFeedStatistics,
  enrichWithDeadReckoning,
  type ParsedVehiclePosition,
  type ParsedTripUpdate,
  type ParsedServiceAlert,
  type FeedStatistics,
  type VehicleSnapshot,
} from '../utils/realtime';

/**
 * Module-level history — survives store updates but is not reactive.
 * Keyed by vehicleId (not tripId, as tripId changes each service day).
 */
const vehicleHistory = new Map<string, VehicleSnapshot>();

interface RealtimeState {
  /** Vehicle positions keyed by tripId */
  vehiclePositions: Map<string, ParsedVehiclePosition>;
  /** Trip updates keyed by tripId */
  tripUpdates: Map<string, ParsedTripUpdate>;
  /** Parsed service alerts */
  serviceAlerts: ParsedServiceAlert[];
  /** Feed statistics from the last successful fetch */
  stats: FeedStatistics | null;
  /** POSIX timestamp (ms) of the last successful fetch */
  lastUpdate: number | null;
  /** Whether a fetch is currently in progress */
  loading: boolean;
  /** Error from the last failed fetch, null if last fetch succeeded */
  error: Error | null;
  /** ISO timestamp from the worker's X-Timestamp header */
  workerTimestamp: string | null;
  /** HIT/MISS status from the worker's X-Cache-Status header */
  cacheStatus: string | null;
  /** Last fetch round-trip time (ms) measured when contacting the proxy */
  fetchLatencyMs: number | null;
  /** Fetch both vehicle-positions and trip-updates feeds in parallel */
  fetchAll: () => Promise<void>;
  /** Clear all realtime data */
  clear: () => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  vehiclePositions: new Map(),
  tripUpdates: new Map(),
  serviceAlerts: [],
  stats: null,
  lastUpdate: null,
  loading: false,
  error: null,
  workerTimestamp: null,
  cacheStatus: null,
  fetchLatencyMs: null,

  fetchAll: async () => {
    set({ loading: true });

    try {
      const [vehicleRes, tripRes] = await Promise.all([
        fetchRealtimeFeed('vehicle-positions'),
        fetchRealtimeFeed('trip-updates'),
      ]);

      const { feed: vehicleFeed, metadata } = vehicleRes;
      const { feed: tripFeed } = tripRes;

      const positions = parseVehiclePositions(vehicleFeed);
      const updates = parseTripUpdates(tripFeed);
      const alerts = parseServiceAlerts(vehicleFeed);
      const stats = getFeedStatistics(vehicleFeed);

      const vehiclePositions = new Map<string, ParsedVehiclePosition>();
      for (const pos of positions) {
        // Enrich with dead-reckoning if we have a previous snapshot
        // Only use history when vehicleId is non-empty (avoids cross-vehicle pollution)
        const historyKey = pos.vehicleId || pos.tripId;
        const prev = historyKey ? vehicleHistory.get(historyKey) : undefined;
        const enriched = prev ? enrichWithDeadReckoning(pos, prev) : pos;

        // Update history with the raw (un-enriched) current position
        if (historyKey) {
          vehicleHistory.set(historyKey, {
            latitude: pos.latitude,
            longitude: pos.longitude,
            timestamp: pos.timestamp,
          });
        }

        if (enriched.tripId) {
          vehiclePositions.set(enriched.tripId, enriched);
        }
      }

      const tripUpdates = new Map<string, ParsedTripUpdate>();
      for (const update of updates) {
        if (update.tripId) {
          tripUpdates.set(update.tripId, update);
        }
      }

      set({
        vehiclePositions,
        tripUpdates,
        serviceAlerts: alerts,
        stats,
        lastUpdate: Date.now(),
        workerTimestamp: metadata.workerTimestamp,
        cacheStatus: metadata.cacheStatus,
        fetchLatencyMs: (metadata as any).fetchTimeMs ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[RealtimeStore] Fetch failed:', error.message);
      set({ loading: false, error });
    }
  },

  clear: () => {
    set({
      vehiclePositions: new Map(),
      tripUpdates: new Map(),
      serviceAlerts: [],
      stats: null,
      lastUpdate: null,
      workerTimestamp: null,
      cacheStatus: null,
      fetchLatencyMs: null,
      error: null,
    });
  },
}));
