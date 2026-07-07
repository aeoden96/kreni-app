/**
 * Zustand store for GTFS Realtime data.
 * Not persisted — realtime data is ephemeral by nature.
 */

import { create } from 'zustand';

import {
  enrichWithDeadReckoning,
  type FeedStatistics,
  fetchRealtimeFeed,
  getFeedStatistics,
  haversineDistance,
  type ParsedServiceAlert,
  type ParsedTripUpdate,
  type ParsedVehiclePosition,
  parseServiceAlerts,
  parseTripUpdates,
  parseVehiclePositions,
  REALTIME_COMBINED_FEED_ENDPOINT,
  type VehicleSnapshot,
} from '../utils/realtime';

/** A vehicle that hasn't moved this far from its anchor is considered stationary */
const STATIONARY_RADIUS_METERS = 15;

/**
 * Module-level history — survives store updates but is not reactive.
 * Keyed by vehicleId (not tripId, as tripId changes each service day).
 */
const vehicleHistory = new Map<string, VehicleSnapshot>();

interface RealtimeState {
  /** Age header from worker cache response, in whole seconds */
  cacheAgeSeconds: null | number;
  /** HIT/MISS status from the worker's X-Cache-Status header */
  cacheStatus: 'HIT' | 'MISS' | null;
  /** Clear all realtime data */
  clear: () => void;
  /** Error from the last failed fetch, null if last fetch succeeded */
  error: Error | null;
  /** Fetch combined GTFS-RT feed once per poll; parse vehicles, trip updates, and alerts */
  fetchAll: () => Promise<void>;
  /** Last fetch round-trip time (ms) measured when contacting the proxy */
  fetchLatencyMs: null | number;
  /** POSIX timestamp (ms) of the last successful fetch */
  lastUpdate: null | number;
  /** Whether a fetch is currently in progress */
  loading: boolean;
  /** Parsed service alerts */
  serviceAlerts: ParsedServiceAlert[];
  /** Feed statistics from the last successful fetch */
  stats: FeedStatistics | null;
  /** Trip updates keyed by tripId */
  tripUpdates: Map<string, ParsedTripUpdate>;
  /** Vehicle positions keyed by tripId */
  vehiclePositions: Map<string, ParsedVehiclePosition>;
  /** ISO timestamp from the worker's X-Timestamp header */
  workerTimestamp: null | string;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  cacheAgeSeconds: null,
  cacheStatus: null,
  clear: () => {
    set({
      cacheAgeSeconds: null,
      cacheStatus: null,
      error: null,
      fetchLatencyMs: null,
      lastUpdate: null,
      serviceAlerts: [],
      stats: null,
      tripUpdates: new Map(),
      vehiclePositions: new Map(),
      workerTimestamp: null,
    });
  },
  error: null,
  fetchAll: async () => {
    set({ loading: true });

    try {
      const { feed, metadata } = await fetchRealtimeFeed(REALTIME_COMBINED_FEED_ENDPOINT);

      const positions = parseVehiclePositions(feed);
      const updates = parseTripUpdates(feed);
      const alerts = parseServiceAlerts(feed);
      const stats = getFeedStatistics(feed);

      const vehiclePositions = new Map<string, ParsedVehiclePosition>();
      const nowWallMs = Date.now();
      for (const pos of positions) {
        // Enrich with dead-reckoning if we have a previous snapshot
        // Only use history when vehicleId is non-empty (avoids cross-vehicle pollution)
        const historyKey = pos.vehicleId || pos.tripId;
        const prev = historyKey ? vehicleHistory.get(historyKey) : undefined;
        const enriched = prev ? enrichWithDeadReckoning(pos, prev) : pos;

        // Stationary anchor: wall-clock based so it also catches a frozen transponder
        // (position AND timestamp stuck) — feed timestamps alone can't be trusted for this.
        let anchorLat = pos.latitude;
        let anchorLon = pos.longitude;
        let anchorWallMs = nowWallMs;
        if (
          prev?.anchorLat !== undefined &&
          prev.anchorLon !== undefined &&
          prev.anchorWallMs !== undefined &&
          haversineDistance(prev.anchorLat, prev.anchorLon, pos.latitude, pos.longitude) <
            STATIONARY_RADIUS_METERS
        ) {
          anchorLat = prev.anchorLat;
          anchorLon = prev.anchorLon;
          anchorWallMs = prev.anchorWallMs;
        }
        enriched.stationarySeconds = Math.round((nowWallMs - anchorWallMs) / 1000);

        // Update history with the raw current position + carried smoothing/anchor state
        if (historyKey) {
          vehicleHistory.set(historyKey, {
            anchorLat,
            anchorLon,
            anchorWallMs,
            bearing: enriched.bearing ?? prev?.bearing,
            latitude: pos.latitude,
            longitude: pos.longitude,
            smoothedSpeed: enriched.speed ?? prev?.smoothedSpeed,
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
        cacheAgeSeconds: metadata.cacheAgeSeconds,
        cacheStatus: metadata.cacheStatus,
        error: null,
        fetchLatencyMs: metadata.fetchTimeMs ?? null,
        lastUpdate: Date.now(),
        loading: false,
        serviceAlerts: alerts,
        stats,
        tripUpdates,
        vehiclePositions,
        workerTimestamp: metadata.workerTimestamp,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[RealtimeStore] Fetch failed:', error.message);
      set({ error, loading: false });
    }
  },
  fetchLatencyMs: null,
  lastUpdate: null,
  loading: false,
  serviceAlerts: [],
  stats: null,
  tripUpdates: new Map(),

  vehiclePositions: new Map(),

  workerTimestamp: null,
}));
