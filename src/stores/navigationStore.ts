import { create } from 'zustand';

interface NavigationState {
    onLocateClick: (() => void) | null;
    locating: boolean;
    isTracking: boolean;
    locateTrigger: number;
    cancelTracking: (() => void) | null;
    setLocateAction: (action: (() => void) | null) => void;
    setLocating: (locating: boolean) => void;
    setIsTracking: (tracking: boolean) => void;
    triggerLocate: () => void;
    setCancelTracking: (cancel: (() => void) | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
    onLocateClick: null,
    locating: false,
    isTracking: false,
    locateTrigger: 0,
    cancelTracking: null,
    setLocateAction: (onLocateClick) => set({ onLocateClick }),
    setLocating: (locating) => set({ locating }),
    setIsTracking: (isTracking) => set({ isTracking }),
    triggerLocate: () => set((state) => ({ locateTrigger: state.locateTrigger + 1 })),
    setCancelTracking: (cancelTracking) => set({ cancelTracking }),
}));
