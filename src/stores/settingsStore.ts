import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type MapTileProvider = 'dark-matter' | 'osm' | 'positron';

interface RecentItem {
  id: string;
  timestamp: number;
}

type Theme = 'dark' | 'light';

const MAX_RECENTS = 10;

interface SettingsState {
  addRecentRoute: (id: string) => void;
  addRecentStop: (id: string) => void;
  clearRecents: () => void;
  /** Prefer more detailed map tiles (Standard / HOT) */
  detailedMap: boolean;
  /** User dismissed the GPS-vs-timetable info tip in stop view */
  dismissedGpsTip: boolean;

  /** Favourite Nextbike / Bajs station UIDs (cycling map) */
  favouriteNextbikeStationUids: number[];
  /** Favourite route IDs */
  favouriteRouteIds: string[];
  /** Favourite stop IDs */
  favouriteStopIds: string[];
  globalOnboardingCompleted: boolean;
  /** Persisted map state across navigations */
  mapCenter: [number, number];
  mapTileProvider: MapTileProvider;
  mapZoom: number;
  onboardingCompleted: Record<string, boolean>;
  onboardingStep: number;
  /** Recently viewed routes (newest first, max 10) */
  recentRoutes: RecentItem[];
  /** Recently viewed stops (newest first, max 10) */
  recentStops: RecentItem[];
  /** Remove specific route IDs from recents */
  removeRecentRoutes: (ids: string[]) => void;
  /** Remove specific stop IDs from recents */
  removeRecentStops: (ids: string[]) => void;
  sandboxVisible: boolean;
  setDetailedMap: (detailed: boolean) => void;
  setDismissedGpsTip: (dismissed: boolean) => void;
  setGlobalOnboardingCompleted: (completed: boolean) => void;
  setMapTileProvider: (provider: MapTileProvider) => void;
  setMapViewport: (center: [number, number], zoom: number) => void;
  setOnboardingCompleted: (mode: string, completed: boolean) => void;
  setOnboardingStep: (step: number) => void;

  setSandboxVisible: (visible: boolean) => void;
  setShowBikeParkings: (show: boolean) => void;
  setShowBikePaths: (show: boolean) => void;
  setShowBikeStations: (show: boolean) => void;
  setShowCongestionHeatmap: (show: boolean) => void;
  setShowElectricCharging: (show: boolean) => void;
  setShowFreeWifi: (show: boolean) => void;

  setShowParkingZones: (show: boolean) => void;
  setShowPedestrianZones: (show: boolean) => void;
  setShowPublicFountains: (show: boolean) => void;
  setShowPublicGarages: (show: boolean) => void;
  setShowRailwayStations: (show: boolean) => void;
  setShowStudentRestaurants: (show: boolean) => void;
  setTheme: (theme: Theme) => void;
  showBikeParkings: boolean;
  showBikePaths: boolean;
  showBikeStations: boolean;
  /** Show tram congestion heatmap overlay */
  showCongestionHeatmap: boolean;
  /** Show electric vehicle charging stations layer */
  showElectricCharging: boolean;
  showFreeWifi: boolean;
  /** Show parking zones layer */
  showParkingZones: boolean;
  showPedestrianZones: boolean;
  showPublicFountains: boolean;
  showPublicGarages: boolean;
  /** Show railway stations layer */
  showRailwayStations: boolean;
  /** Zagreb city data toggles */
  showStudentRestaurants: boolean;
  theme: Theme;
  toggleFavouriteNextbikeStation: (uid: number) => void;
  toggleFavouriteRoute: (id: string) => void;
  toggleFavouriteStop: (id: string) => void;
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
        detailedMap: true,
        dismissedGpsTip: false,
        favouriteNextbikeStationUids: [],

        favouriteRouteIds: [],
        favouriteStopIds: [],
        globalOnboardingCompleted: false,
        mapCenter: [45.815, 15.977],
        mapTileProvider: initialTheme === 'dark' ? 'dark-matter' : 'osm',
        mapZoom: 13,
        onboardingCompleted: {},
        onboardingStep: 0,
        recentRoutes: [],
        recentStops: [],
        removeRecentRoutes: (ids) =>
          set((s) => ({
            recentRoutes: s.recentRoutes.filter((r) => !ids.includes(r.id)),
          })),
        removeRecentStops: (ids) =>
          set((s) => ({
            recentStops: s.recentStops.filter((item) => !ids.includes(item.id)),
          })),
        sandboxVisible: false,
        setDetailedMap: (detailed) => set({ detailedMap: detailed }),
        setDismissedGpsTip: (dismissed) => set({ dismissedGpsTip: dismissed }),
        setGlobalOnboardingCompleted: (completed) => set({ globalOnboardingCompleted: completed }),
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
        setMapViewport: (mapCenter, mapZoom) => set({ mapCenter, mapZoom }),
        setOnboardingCompleted: (mode, completed) =>
          set((s) => ({
            onboardingCompleted: { ...s.onboardingCompleted, [mode]: completed },
          })),
        setOnboardingStep: (step) => set({ onboardingStep: step }),

        setSandboxVisible: (visible) => set({ sandboxVisible: visible }),
        setShowBikeParkings: (show) => set({ showBikeParkings: show }),
        setShowBikePaths: (show) => set({ showBikePaths: show }),
        setShowBikeStations: (show) => set({ showBikeStations: show }),
        setShowCongestionHeatmap: (show) => set({ showCongestionHeatmap: show }),
        setShowElectricCharging: (show) => set({ showElectricCharging: show }),
        setShowFreeWifi: (show) => set({ showFreeWifi: show }),

        setShowParkingZones: (show) => set({ showParkingZones: show }),
        setShowPedestrianZones: (show) => set({ showPedestrianZones: show }),
        setShowPublicFountains: (show) => set({ showPublicFountains: show }),
        setShowPublicGarages: (show) => set({ showPublicGarages: show }),
        setShowRailwayStations: (show) => set({ showRailwayStations: show }),
        setShowStudentRestaurants: (show) => set({ showStudentRestaurants: show }),
        setTheme: (theme) => {
          const providerForTheme: MapTileProvider = theme === 'dark' ? 'dark-matter' : 'osm';
          set({ mapTileProvider: providerForTheme, theme });
          try {
            document.documentElement.setAttribute('data-theme', theme);
          } catch (_e) {
            void _e;
          }
          localStorage.setItem('theme', theme);
        },
        showBikeParkings: false,
        showBikePaths: false,
        showBikeStations: true,
        showCongestionHeatmap: false,
        showElectricCharging: false,
        showFreeWifi: false,
        showParkingZones: false,
        showPedestrianZones: false,

        showPublicFountains: true,

        showPublicGarages: true,

        showRailwayStations: false,

        showStudentRestaurants: false,

        theme: initialTheme,

        toggleFavouriteNextbikeStation: (uid) =>
          set((s) => ({
            favouriteNextbikeStationUids: s.favouriteNextbikeStationUids.includes(uid)
              ? s.favouriteNextbikeStationUids.filter((u) => u !== uid)
              : [...s.favouriteNextbikeStationUids, uid],
          })),
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
      };
    },
    {
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Partial<SettingsState> & { showRoadClosures?: boolean };
        const next: Record<string, unknown> = { ...state };
        if (fromVersion < 2) {
          next.detailedMap = true;
        }
        if (fromVersion < 3) {
          delete next.showRoadClosures;
        }
        if (fromVersion < 4) {
          // Mark existing users so they don't see the new global welcome wizard
          next.globalOnboardingCompleted = true;
        }
        if (fromVersion < 5) {
          delete next.appMode;
        }
        return next as Partial<SettingsState>;
      },
      name: 'kreni-settings',
      // Bump version here whenever a default value changes and you want
      // existing users' stored value to be overridden with the new default.
      // migrate() receives the persisted state and should return the corrected state.
      version: 5,
    }
  )
);
