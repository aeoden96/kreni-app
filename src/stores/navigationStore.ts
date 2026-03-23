import { create } from 'zustand';

interface NavigationState {
  cancelTracking: (() => void) | null;
  isTracking: boolean;
  locateTrigger: number;
  locating: boolean;
  onLocateClick: (() => void) | null;
  setCancelTracking: (cancel: (() => void) | null) => void;
  setIsTracking: (tracking: boolean) => void;
  setLocateAction: (action: (() => void) | null) => void;
  setLocating: (locating: boolean) => void;
  triggerLocate: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  cancelTracking: null,
  isTracking: false,
  locateTrigger: 0,
  locating: false,
  onLocateClick: null,
  setCancelTracking: (cancelTracking) => set({ cancelTracking }),
  setIsTracking: (isTracking) => set({ isTracking }),
  setLocateAction: (onLocateClick) => set({ onLocateClick }),
  setLocating: (locating) => set({ locating }),
  triggerLocate: () => set((state) => ({ locateTrigger: state.locateTrigger + 1 })),
}));
