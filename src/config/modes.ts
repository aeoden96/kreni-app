/**
 * GTFS mode configuration — a single typed object that describes all
 * mode-specific parameters so that no raw "data-train" / "data" strings
 * need to be scattered across hooks, components, or pages.
 */

export interface GTFSModeConfig {
  /**
   * When true, stops are always fully visible regardless of zoom level.
   * Useful for train mode where stations are sparse and need to be seen at
   * country-level zoom.
   */
  alwaysShowStops: boolean;
  /** Public data directory served by Vite (e.g. 'data' → /data/…). */
  dataDir: 'data' | 'data-train';
  /** Whether to subscribe to the GTFS-RT realtime proxy. */
  hasRealtime: boolean;
  /** Unique identifier for the mode. */
  id: 'train' | 'transit';
  /** Initial map zoom on first load. Falls back to BaseMap default (13) when undefined. */
  initialZoom?: number;
  /** i18n key under `gtfs.*` for the initial load spinner label. */
  loadingI18nKey: 'loadingTrain' | 'loadingTransit';
  /** Minimum zoom allowed on the map. Falls back to BaseMap default (11) when undefined. */
  minZoom?: number;
  /** Variant passed to <OnboardingWizard>. */
  onboardingVariant: 'train' | 'transit';
  /** Map zoom level used when flying to a single stop. */
  stopZoom: number;
  /** How many minutes to look ahead when showing the timetable. */
  timetableLookaheadMinutes: number;
}

/** ZET bus / tram public transport (default mode). */
export const TRANSIT_MODE: GTFSModeConfig = {
  alwaysShowStops: false,
  dataDir: 'data',
  hasRealtime: true,
  id: 'transit',
  loadingI18nKey: 'loadingTransit',
  onboardingVariant: 'transit',
  stopZoom: 17,
  timetableLookaheadMinutes: 60,
};

/** HŽ Passenger Transport regional / suburban trains. */
export const TRAIN_MODE: GTFSModeConfig = {
  alwaysShowStops: true,
  dataDir: 'data-train',
  hasRealtime: false,
  id: 'train',
  initialZoom: 9,
  loadingI18nKey: 'loadingTrain',
  minZoom: 7,
  onboardingVariant: 'train',
  stopZoom: 15,
  timetableLookaheadMinutes: 300,
};
