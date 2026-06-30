import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { MapFavouriteScope, MapPlaceFavourite } from '../types/mapPlaceFavourite';

import { makeMapPlaceFavouriteId } from '../utils/mapPlaceFavouriteKey';

/**
 * Cycling basemap when Staze (bike paths) is on:
 * - full: CyclOSM bike map tiles
 * - standard: theme-based map + bike paths GeoJSON (Grad Zagreb / data.zagreb.hr source)
 */
export type CyclosmMapVariant = 'full' | 'standard';

type MapTileProvider = 'dark-matter' | 'osm' | 'positron';

interface RecentItem {
  id: string;
  timestamp: number;
}

type Theme = 'dark' | 'light';

const MAX_RECENTS = 10;

export const MAX_MAP_PLACE_FAVOURITES = 28;

type MapPlaceFavouriteToggleResult = 'added' | 'at_cap' | 'removed';

interface SettingsState {
  addRecentRoute: (id: string) => void;
  addRecentStop: (id: string) => void;
  clearRecents: () => void;
  /** CyclOSM tile style (cycling map, when bike paths layer is shown) */
  cyclosmMapVariant: CyclosmMapVariant;
  /** Prefer more detailed map tiles (Standard / HOT) */
  detailedMap: boolean;

  /** User dismissed the GPS-vs-timetable info tip in stop view */
  dismissedGpsTip: boolean;

  /** Favourite route IDs */
  favouriteRouteIds: string[];
  /** Favourite stop IDs */
  favouriteStopIds: string[];
  globalOnboardingCompleted: boolean;
  /** Persisted map state across navigations */
  mapCenter: [number, number];
  mapPlaceFavouritesCity: MapPlaceFavourite[];
  mapPlaceFavouritesCycling: MapPlaceFavourite[];
  mapPlaceFavouritesDriving: MapPlaceFavourite[];
  mapTileProvider: MapTileProvider;
  mapZoom: number;
  onboardingCompleted: Record<string, boolean>;
  onboardingStep: number;
  /** Recently viewed routes (newest first, max 10) */
  recentRoutes: RecentItem[];
  /** Recently viewed stops (newest first, max 10) */
  recentStops: RecentItem[];
  /** Remove specific stop IDs from recents */
  removeMapPlaceFavourite: (scope: MapFavouriteScope, id: string) => void;
  /** Remove specific route IDs from recents */
  removeRecentRoutes: (ids: string[]) => void;
  removeRecentStops: (ids: string[]) => void;
  sandboxVisible: boolean;
  setCyclosmMapVariant: (variant: CyclosmMapVariant) => void;
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
  setShowCulturalInstitutions: (show: boolean) => void;
  setShowDogParks: (show: boolean) => void;
  setShowDomesticAnimalZones: (show: boolean) => void;
  setShowElectricCharging: (show: boolean) => void;
  setShowEvacuationAreas: (show: boolean) => void;

  setShowFreeWifi: (show: boolean) => void;
  setShowGalleries: (show: boolean) => void;
  setShowGasStations: (show: boolean) => void;
  setShowGraffiti: (show: boolean) => void;
  setShowHealthHomes: (show: boolean) => void;
  setShowHealthInstitutions: (show: boolean) => void;
  setShowMarkets: (show: boolean) => void;
  setShowParkingZones: (show: boolean) => void;
  setShowPedestrianZones: (show: boolean) => void;
  setShowPharmacies: (show: boolean) => void;
  setShowPlaygrounds: (show: boolean) => void;
  setShowPublicArchitectureCompetitions: (show: boolean) => void;
  setShowPublicFountains: (show: boolean) => void;
  setShowPublicGarages: (show: boolean) => void;
  setShowPublicGardens: (show: boolean) => void;
  setShowPublicToilets: (show: boolean) => void;
  setShowRailwayStations: (show: boolean) => void;
  setShowRecyclingYards: (show: boolean) => void;
  setShowRoadClosures: (show: boolean) => void;
  setShowSportsFacilities: (show: boolean) => void;
  setShowStudentRestaurants: (show: boolean) => void;
  setShowSurveillanceCameras: (show: boolean) => void;
  setShowTaxiStands: (show: boolean) => void;
  setTheme: (theme: Theme) => void;
  showBikeParkings: boolean;
  showBikePaths: boolean;
  showBikeStations: boolean;
  /** Show tram congestion heatmap overlay */
  showCongestionHeatmap: boolean;
  /** Show cultural institutions layer */
  showCulturalInstitutions: boolean;
  /** Show public dog parks layer */
  showDogParks: boolean;
  /** Show domestic animal zones layer */
  showDomesticAnimalZones: boolean;
  /** Show electric vehicle charging stations layer */
  showElectricCharging: boolean;
  /** Show evacuation assembly areas layer */
  showEvacuationAreas: boolean;
  showFreeWifi: boolean;
  /** Show galleries layer */
  showGalleries: boolean;
  /** Show gas stations layer */
  showGasStations: boolean;
  /** Show graffiti reports layer */
  showGraffiti: boolean;
  /** Show health homes (dom zdravlja) layer */
  showHealthHomes: boolean;
  /** Show health institutions layer */
  showHealthInstitutions: boolean;
  /** Show markets (tržnice) layer */
  showMarkets: boolean;
  /** Show parking zones layer */
  showParkingZones: boolean;
  showPedestrianZones: boolean;
  /** Show pharmacies layer */
  showPharmacies: boolean;
  /** Show public playgrounds layer */
  showPlaygrounds: boolean;
  /** Show public architecture competitions layer */
  showPublicArchitectureCompetitions: boolean;
  showPublicFountains: boolean;
  showPublicGarages: boolean;
  /** Show public gardens layer */
  showPublicGardens: boolean;
  /** Show public toilets layer */
  showPublicToilets: boolean;
  /** Show railway stations layer */
  showRailwayStations: boolean;
  /** Show recycling yards layer */
  showRecyclingYards: boolean;
  /** Show road closures overlay (driving mode) */
  showRoadClosures: boolean;
  /** Zagreb city data toggles */
  showSportsFacilities: boolean;
  /** Show sports facilities layer */
  showStudentRestaurants: boolean;
  /** Show surveillance cameras layer */
  showSurveillanceCameras: boolean;
  /** Show taxi stands layer */
  showTaxiStands: boolean;
  theme: Theme;
  toggleFavouriteRoute: (id: string) => void;
  toggleFavouriteStop: (id: string) => void;
  toggleMapPlaceFavourite: (input: {
    lat: number;
    layerId: MapPlaceFavourite['layerId'];
    lng: number;
    scope: MapFavouriteScope;
    sourceId?: string;
    title: string;
  }) => MapPlaceFavouriteToggleResult;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => {
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
        cyclosmMapVariant: 'full',
        detailedMap: true,
        dismissedGpsTip: false,

        favouriteRouteIds: [],
        favouriteStopIds: [],
        globalOnboardingCompleted: false,
        mapCenter: [45.815, 15.977],
        mapPlaceFavouritesCity: [],
        mapPlaceFavouritesCycling: [],
        mapPlaceFavouritesDriving: [],
        mapTileProvider: initialTheme === 'dark' ? 'dark-matter' : 'osm',
        mapZoom: 13,
        onboardingCompleted: {},
        onboardingStep: 0,
        recentRoutes: [],
        recentStops: [],
        removeMapPlaceFavourite: (scope, id) =>
          set((s) => {
            if (scope === 'city') {
              return {
                mapPlaceFavouritesCity: s.mapPlaceFavouritesCity.filter((x) => x.id !== id),
              };
            }
            if (scope === 'cycling') {
              return {
                mapPlaceFavouritesCycling: s.mapPlaceFavouritesCycling.filter((x) => x.id !== id),
              };
            }
            return {
              mapPlaceFavouritesDriving: s.mapPlaceFavouritesDriving.filter((x) => x.id !== id),
            };
          }),
        removeRecentRoutes: (ids) =>
          set((s) => ({
            recentRoutes: s.recentRoutes.filter((r) => !ids.includes(r.id)),
          })),
        removeRecentStops: (ids) =>
          set((s) => ({
            recentStops: s.recentStops.filter((item) => !ids.includes(item.id)),
          })),
        sandboxVisible: false,
        setCyclosmMapVariant: (variant) => set({ cyclosmMapVariant: variant }),
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
        setMapViewport: (mapCenter, mapZoom) =>
          set((s) => {
            const [lat, lng] = mapCenter;
            const [prevLat, prevLng] = s.mapCenter;
            if (
              Math.abs(prevLat - lat) < 1e-7 &&
              Math.abs(prevLng - lng) < 1e-7 &&
              s.mapZoom === mapZoom
            ) {
              return s;
            }
            return { mapCenter, mapZoom };
          }),
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
        setShowCulturalInstitutions: (show) => set({ showCulturalInstitutions: show }),
        setShowDogParks: (show) => set({ showDogParks: show }),
        setShowDomesticAnimalZones: (show) => set({ showDomesticAnimalZones: show }),
        setShowElectricCharging: (show) => set({ showElectricCharging: show }),
        setShowEvacuationAreas: (show) => set({ showEvacuationAreas: show }),

        setShowFreeWifi: (show) => set({ showFreeWifi: show }),
        setShowGalleries: (show) => set({ showGalleries: show }),
        setShowGasStations: (show) => set({ showGasStations: show }),
        setShowGraffiti: (show) => set({ showGraffiti: show }),
        setShowHealthHomes: (show) => set({ showHealthHomes: show }),
        setShowHealthInstitutions: (show) => set({ showHealthInstitutions: show }),
        setShowMarkets: (show) => set({ showMarkets: show }),
        setShowParkingZones: (show) => set({ showParkingZones: show }),
        setShowPedestrianZones: (show) => set({ showPedestrianZones: show }),
        setShowPharmacies: (show) => set({ showPharmacies: show }),
        setShowPlaygrounds: (show) => set({ showPlaygrounds: show }),
        setShowPublicArchitectureCompetitions: (show) =>
          set({ showPublicArchitectureCompetitions: show }),
        setShowPublicFountains: (show) => set({ showPublicFountains: show }),
        setShowPublicGarages: (show) => set({ showPublicGarages: show }),
        setShowPublicGardens: (show) => set({ showPublicGardens: show }),
        setShowPublicToilets: (show) => set({ showPublicToilets: show }),
        setShowRailwayStations: (show) => set({ showRailwayStations: show }),
        setShowRecyclingYards: (show) => set({ showRecyclingYards: show }),
        setShowRoadClosures: (show) => set({ showRoadClosures: show }),
        setShowSportsFacilities: (show) => set({ showSportsFacilities: show }),
        setShowStudentRestaurants: (show) => set({ showStudentRestaurants: show }),
        setShowSurveillanceCameras: (show) => set({ showSurveillanceCameras: show }),
        setShowTaxiStands: (show) => set({ showTaxiStands: show }),
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
        showCulturalInstitutions: true,
        showDogParks: false,
        showDomesticAnimalZones: false,
        showElectricCharging: false,
        showEvacuationAreas: false,
        showFreeWifi: false,
        showGalleries: false,
        showGasStations: false,
        showGraffiti: false,
        showHealthHomes: false,
        showHealthInstitutions: false,
        showMarkets: false,

        showParkingZones: true,

        showPedestrianZones: false,

        showPharmacies: false,

        showPlaygrounds: true,

        showPublicArchitectureCompetitions: false,

        showPublicFountains: true,

        showPublicGarages: true,

        showPublicGardens: true,

        showPublicToilets: false,

        showRailwayStations: false,

        showRecyclingYards: false,

        showRoadClosures: true,

        showSportsFacilities: false,

        showStudentRestaurants: false,

        showSurveillanceCameras: false,

        showTaxiStands: false,

        theme: initialTheme,

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
        toggleMapPlaceFavourite: ({ lat, layerId, lng, scope, sourceId, title }) => {
          const id = makeMapPlaceFavouriteId(scope, layerId, lng, lat, sourceId);
          const state = get();
          const list =
            scope === 'city'
              ? state.mapPlaceFavouritesCity
              : scope === 'cycling'
                ? state.mapPlaceFavouritesCycling
                : state.mapPlaceFavouritesDriving;
          const existing = list.find((x) => x.id === id);
          if (existing) {
            if (scope === 'city') {
              set({
                mapPlaceFavouritesCity: state.mapPlaceFavouritesCity.filter((x) => x.id !== id),
              });
            } else if (scope === 'cycling') {
              set({
                mapPlaceFavouritesCycling: state.mapPlaceFavouritesCycling.filter(
                  (x) => x.id !== id
                ),
              });
            } else {
              set({
                mapPlaceFavouritesDriving: state.mapPlaceFavouritesDriving.filter(
                  (x) => x.id !== id
                ),
              });
            }
            return 'removed';
          }
          if (list.length >= MAX_MAP_PLACE_FAVOURITES) {
            return 'at_cap';
          }
          const entry: MapPlaceFavourite = {
            id,
            lat,
            layerId,
            lng,
            scope,
            sourceId: sourceId || undefined,
            title,
          };
          if (scope === 'city') {
            set({ mapPlaceFavouritesCity: [...state.mapPlaceFavouritesCity, entry] });
          } else if (scope === 'cycling') {
            set({ mapPlaceFavouritesCycling: [...state.mapPlaceFavouritesCycling, entry] });
          } else {
            set({ mapPlaceFavouritesDriving: [...state.mapPlaceFavouritesDriving, entry] });
          }
          return 'added';
        },
      };
    },
    {
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as Partial<SettingsState> & {
          favouriteNextbikeStationUids?: number[];
          pendingNextbikeUidMigration?: number[];
        };
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
          // Removed CyclOSM lite; map legacy value to full
          const v = next.cyclosmMapVariant as string | undefined;
          if (v === 'lite') {
            next.cyclosmMapVariant = 'full';
          }
          delete next.appMode;
        }
        if (fromVersion < 7) {
          // Major map-favourites release: ensure slices exist; drop legacy Nextbike UID storage (not migrated).
          next.mapPlaceFavouritesCity = Array.isArray(next.mapPlaceFavouritesCity)
            ? next.mapPlaceFavouritesCity
            : [];
          next.mapPlaceFavouritesDriving = Array.isArray(next.mapPlaceFavouritesDriving)
            ? next.mapPlaceFavouritesDriving
            : [];
          next.mapPlaceFavouritesCycling = Array.isArray(next.mapPlaceFavouritesCycling)
            ? next.mapPlaceFavouritesCycling
            : [];
          delete next.favouriteNextbikeStationUids;
          delete next.pendingNextbikeUidMigration;
        }
        if (fromVersion < 8) {
          // Cycling: Nextbike-only defaults
          next.showBikeStations = true;
          next.showBikeParkings = false;
          next.showBikePaths = false;
          // City: turn on curated defaults when not already active
          if (!next.showCulturalInstitutions) next.showCulturalInstitutions = true;
          if (!next.showPublicGardens) next.showPublicGardens = true;
          if (!next.showPlaygrounds) next.showPlaygrounds = true;
          // Driving: parking zones + road closures overlay
          if (!next.showParkingZones) next.showParkingZones = true;
          if (!next.showRoadClosures) next.showRoadClosures = true;
        }
        if (fromVersion < 9) {
          // Removed the transit bottom-tools FAB (menu); drop its persisted state.
          delete next.transitBottomToolsOpen;
        }
        return next as Partial<SettingsState>;
      },
      name: 'kreni-settings',
      // Bump version here whenever a default value changes and you want
      // existing users' stored value to be overridden with the new default.
      // migrate() receives the persisted state and should return the corrected state.
      version: 9,
    }
  )
);
