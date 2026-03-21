import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MapTileProvider = 'osm' | 'positron' | 'dark-matter';
type Theme = 'light' | 'dark';

type AppMode = 'map' | 'list';

interface RecentItem {
  id: string;
  timestamp: number;
}

const MAX_RECENTS = 10;

interface SettingsState {
  sandboxVisible: boolean;
  mapTileProvider: MapTileProvider;
  theme: Theme;
  onboardingCompleted: Record<string, boolean>;
  onboardingStep: number;

  showAllVehicles: boolean;
  showBikeStations: boolean;
  showBikeParkings: boolean;
  showBikePaths: boolean;
  /** Zagreb city data toggles */
  showStudentRestaurants: boolean;
  showPublicFountains: boolean;
  showPedestrianZones: boolean;
  showFreeWifi: boolean;
  showPublicGarages: boolean;
  /** Show electric vehicle charging stations layer */
  showElectricCharging: boolean;
  /** Show parking zones layer */
  showParkingZones: boolean;
  /** Show tram congestion heatmap overlay */
  showCongestionHeatmap: boolean;
  /** Show railway stations layer */
  showRailwayStations: boolean;
  /** Prefer more detailed map tiles (Standard / HOT) */
  detailedMap: boolean;
  appMode: AppMode;
  /** Favourite route IDs */
  favouriteRouteIds: string[];
  /** Favourite stop IDs */
  favouriteStopIds: string[];
  /** Favourite Nextbike / Bajs station UIDs (cycling map) */
  favouriteNextbikeStationUids: number[];
  /** Recently viewed routes (newest first, max 10) */
  recentRoutes: RecentItem[];
  /** Recently viewed stops (newest first, max 10) */
  recentStops: RecentItem[];
  /** User dismissed the GPS-vs-timetable info tip in stop view */
  dismissedGpsTip: boolean;
  /** Persisted map state across navigations */
  mapCenter: [number, number];
  mapZoom: number;

  setSandboxVisible: (visible: boolean) => void;
  setMapTileProvider: (provider: MapTileProvider) => void;
  setTheme: (theme: Theme) => void;
  setDetailedMap: (detailed: boolean) => void;
  setOnboardingCompleted: (mode: string, completed: boolean) => void;
  setOnboardingStep: (step: number) => void;

  setShowAllVehicles: (show: boolean) => void;
  setShowBikeStations: (show: boolean) => void;
  setShowBikeParkings: (show: boolean) => void;
  setShowBikePaths: (show: boolean) => void;
  setShowStudentRestaurants: (show: boolean) => void;
  setShowPublicFountains: (show: boolean) => void;
  setShowPedestrianZones: (show: boolean) => void;
  setShowFreeWifi: (show: boolean) => void;
  setShowPublicGarages: (show: boolean) => void;
  setShowElectricCharging: (show: boolean) => void;
  setShowParkingZones: (show: boolean) => void;
  setShowCongestionHeatmap: (show: boolean) => void;
  setShowRailwayStations: (show: boolean) => void;
  setAppMode: (mode: AppMode) => void;
  setDismissedGpsTip: (dismissed: boolean) => void;
  setMapViewport: (center: [number, number], zoom: number) => void;
  toggleFavouriteRoute: (id: string) => void;
  toggleFavouriteStop: (id: string) => void;
  toggleFavouriteNextbikeStation: (uid: number) => void;
  addRecentRoute: (id: string) => void;
  addRecentStop: (id: string) => void;
  clearRecents: () => void;
  /** Remove specific route IDs from recents */
  removeRecentRoutes: (ids: string[]) => void;
  /** Remove specific stop IDs from recents */
  removeRecentStops: (ids: string[]) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => {
      const initialTheme = (localStorage.getItem('theme') as Theme) || 'dark';
      // Ensure the document theme attribute matches the initial value
      try {
        document.documentElement.setAttribute('data-theme', initialTheme);
      } catch (_e) {
        // no-op (safe for environments without document)
        void _e;
      }

      return {
        sandboxVisible: false,
        mapTileProvider: initialTheme === 'dark' ? 'dark-matter' : 'osm',
        theme: initialTheme,
        detailedMap: true,
        onboardingCompleted: {},
        onboardingStep: 0,

        showAllVehicles: true,
        showBikeStations: true,
        showBikeParkings: false,
        showBikePaths: false,
        showStudentRestaurants: false,
        showPublicFountains: true,
        showPedestrianZones: false,
        showFreeWifi: false,
        showPublicGarages: true,
        showElectricCharging: false,
        showParkingZones: false,
        showCongestionHeatmap: false,
        showRailwayStations: false,
        appMode: 'map',
        favouriteRouteIds: [],
        favouriteStopIds: [],
        favouriteNextbikeStationUids: [],
        recentRoutes: [],
        recentStops: [],
        dismissedGpsTip: false,
        mapCenter: [45.815, 15.977],
        mapZoom: 13,

        setSandboxVisible: (visible) => set({ sandboxVisible: visible }),
        setDetailedMap: (detailed) => set({ detailedMap: detailed }),
        setMapTileProvider: (provider) => {
          const themeForProvider: Theme = provider === 'dark-matter' ? 'dark' : 'light';
          set({ mapTileProvider: provider, theme: themeForProvider });
          try {
            document.documentElement.setAttribute('data-theme', themeForProvider);
          } catch (_e) {
            void _e;
          }
          localStorage.setItem('theme', themeForProvider);
        },
        setTheme: (theme) => {
          const providerForTheme: MapTileProvider = theme === 'dark' ? 'dark-matter' : 'osm';
          set({ theme, mapTileProvider: providerForTheme });
          try {
            document.documentElement.setAttribute('data-theme', theme);
          } catch (_e) {
            void _e;
          }
          localStorage.setItem('theme', theme);
        },
        setOnboardingCompleted: (mode, completed) =>
          set((s) => ({
            onboardingCompleted: { ...s.onboardingCompleted, [mode]: completed }
          })),
        setOnboardingStep: (step) => set({ onboardingStep: step }),

        setShowAllVehicles: (show) => set({ showAllVehicles: show }),
        setShowBikeStations: (show) => set({ showBikeStations: show }),
        setShowBikeParkings: (show) => set({ showBikeParkings: show }),
        setShowBikePaths: (show) => set({ showBikePaths: show }),
        setShowStudentRestaurants: (show) => set({ showStudentRestaurants: show }),
        setShowPublicFountains: (show) => set({ showPublicFountains: show }),
        setShowPedestrianZones: (show) => set({ showPedestrianZones: show }),
        setShowFreeWifi: (show) => set({ showFreeWifi: show }),
        setShowPublicGarages: (show) => set({ showPublicGarages: show }),
        setShowElectricCharging: (show) => set({ showElectricCharging: show }),
        setShowParkingZones: (show) => set({ showParkingZones: show }),
        setShowCongestionHeatmap: (show) => set({ showCongestionHeatmap: show }),
        setShowRailwayStations: (show) => set({ showRailwayStations: show }),
        setAppMode: (mode) => set({ appMode: mode }),
        setDismissedGpsTip: (dismissed) => set({ dismissedGpsTip: dismissed }),
        setMapViewport: (mapCenter, mapZoom) => set({ mapCenter, mapZoom }),

        toggleFavouriteRoute: (id) =>
          set((s) => ({
            favouriteRouteIds: s.favouriteRouteIds.includes(id)
              ? s.favouriteRouteIds.filter((r) => r !== id)
              : [...s.favouriteRouteIds, id],
          })),

        toggleFavouriteStop: (id) =>
          set((s) => ({
            favouriteStopIds: s.favouriteStopIds.includes(id)
              ? s.favouriteStopIds.filter((r) => r !== id)
              : [...s.favouriteStopIds, id],
          })),

        toggleFavouriteNextbikeStation: (uid) =>
          set((s) => ({
            favouriteNextbikeStationUids: s.favouriteNextbikeStationUids.includes(uid)
              ? s.favouriteNextbikeStationUids.filter((u) => u !== uid)
              : [...s.favouriteNextbikeStationUids, uid],
          })),

        addRecentRoute: (id) =>
          set((s) => {
            const filtered = s.recentRoutes.filter((r) => r.id !== id);
            return {
              recentRoutes: [{ id, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENTS),
            };
          }),

        addRecentStop: (id) =>
          set((s) => {
            const filtered = s.recentStops.filter((r) => r.id !== id);
            return {
              recentStops: [{ id, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENTS),
            };
          }),

        clearRecents: () => set({ recentRoutes: [], recentStops: [] }),
        removeRecentRoutes: (ids) =>
          set((s) => ({
            recentRoutes: s.recentRoutes.filter((r) => !ids.includes(r.id)),
          })),
        removeRecentStops: (ids) =>
          set((s) => ({
            recentStops: s.recentStops.filter((item) => !ids.includes(item.id)),
          })),
      };
    },
    {
      name: 'kreni-settings',
      // Bump version here whenever a default value changes and you want
      // existing users' stored value to be overridden with the new default.
      // migrate() receives the persisted state and should return the corrected state.
      version: 3,
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Partial<SettingsState> & { showRoadClosures?: boolean };
        const next: Record<string, unknown> = { ...state };
        if (fromVersion < 2) {
          next.detailedMap = true;
        }
        if (fromVersion < 3) {
          delete next.showRoadClosures;
        }
        return next as Partial<SettingsState>;
      },
    }
  )
);
