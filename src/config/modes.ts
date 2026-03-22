/**
 * GTFS mode configuration — a single typed object that describes all
 * mode-specific parameters so that no raw "data-train" / "data" strings
 * need to be scattered across hooks, components, or pages.
 */

export interface GTFSModeConfig {
  /** Unique identifier for the mode. */
  id: 'transit' | 'train';
  /** Public data directory served by Vite (e.g. 'data' → /data/…). */
  dataDir: 'data' | 'data-train';
  /** Whether to subscribe to the GTFS-RT realtime proxy. */
  hasRealtime: boolean;
  /** Map zoom level used when flying to a single stop. */
  stopZoom: number;
  /** i18n key under `gtfs.*` for the initial load spinner label. */
  loadingI18nKey: 'loadingTransit' | 'loadingTrain';
  /** Variant passed to <OnboardingWizard>. */
  onboardingVariant: 'transit' | 'train';
  /**
   * When true, stops are always fully visible regardless of zoom level.
   * Useful for train mode where stations are sparse and need to be seen at
   * country-level zoom.
   */
  alwaysShowStops: boolean;
  /** Initial map zoom on first load. Falls back to BaseMap default (13) when undefined. */
  initialZoom?: number;
  /** Minimum zoom allowed on the map. Falls back to BaseMap default (11) when undefined. */
  minZoom?: number;
  /** How many minutes to look ahead when showing the timetable. */
  timetableLookaheadMinutes: number;
}

/** ZET bus / tram public transport (default mode). */
export const TRANSIT_MODE: GTFSModeConfig = {
  id: 'transit',
  dataDir: 'data',
  hasRealtime: true,
  stopZoom: 17,
  loadingI18nKey: 'loadingTransit',
  onboardingVariant: 'transit',
  alwaysShowStops: false,
  timetableLookaheadMinutes: 60,
};

/** HŽ Passenger Transport regional / suburban trains. */
export const TRAIN_MODE: GTFSModeConfig = {
  id: 'train',
  dataDir: 'data-train',
  hasRealtime: false,
  stopZoom: 15,
  loadingI18nKey: 'loadingTrain',
  onboardingVariant: 'train',
  alwaysShowStops: true,
  initialZoom: 9,
  minZoom: 7,
  timetableLookaheadMinutes: 300,
};
