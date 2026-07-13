import { create } from 'zustand';

type MapFlyToPulse = {
  lat: number;
  lng: number;
  until: number;
};

interface NavigationState {
  cancelTracking: (() => void) | null;
  clearMapPulse: () => void;
  isTracking: boolean;
  locateTrigger: number;
  locating: boolean;
  /** Consumed by {@link BaseMap} fly handler; cleared after fly starts. */
  mapFlyToPending: null | { lat: number; lng: number; zoom?: number };
  mapFlyToRequestId: number;
  mapPulse: MapFlyToPulse | null;
  onLocateClick: (() => void) | null;
  requestMapFlyTo: (opts: { lat: number; lng: number; pulseMs?: number; zoom?: number }) => void;
  setCancelTracking: (cancel: (() => void) | null) => void;
  setIsTracking: (tracking: boolean) => void;
  setLocateAction: (action: (() => void) | null) => void;
  setLocating: (locating: boolean) => void;
  triggerLocate: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  cancelTracking: null,
  clearMapPulse: () => set({ mapPulse: null }),
  isTracking: false,
  locateTrigger: 0,
  locating: false,
  mapFlyToPending: null,
  mapFlyToRequestId: 0,
  mapPulse: null,
  onLocateClick: null,
  requestMapFlyTo: ({ lat, lng, pulseMs = 0, zoom }) =>
    set((state) => ({
      mapFlyToPending: { lat, lng, zoom },
      mapFlyToRequestId: state.mapFlyToRequestId + 1,
      mapPulse: pulseMs > 0 ? { lat, lng, until: Date.now() + pulseMs } : null,
    })),
  setCancelTracking: (cancelTracking) => set({ cancelTracking }),
  setIsTracking: (isTracking) => set({ isTracking }),
  setLocateAction: (onLocateClick) => set({ onLocateClick }),
  setLocating: (locating) => set({ locating }),
  triggerLocate: () => set((state) => ({ locateTrigger: state.locateTrigger + 1 })),
}));
