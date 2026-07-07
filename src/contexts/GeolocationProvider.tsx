import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useNavigationStore } from '../stores/navigationStore';
import {
  clearWatch,
  type GeoWatchId,
  isGeolocationAvailable,
  watchPosition,
} from '../utils/geolocation';

type GeolocationContextValue = {
  locateError: null | string;
  userLocation: null | { lat: number; lon: number };
};

type LocateFirstFix = (lat: number, lon: number) => void;

const GeolocationContext = createContext<GeolocationContextValue | null>(null);

/** Ref lives in provider; GTFSMode registers a transit-only first-fix callback. */
const FirstFixCallbackRefContext =
  createContext<null | React.MutableRefObject<LocateFirstFix | null>>(null);

const MISSING_PROVIDER = 'useGeolocation must be used within GeolocationProvider.';

export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [userLocation, setUserLocation] = useState<GeolocationContextValue['userLocation']>(null);
  const [locateError, setLocateError] = useState<null | string>(null);

  const firstFixCallbackRef = useRef<LocateFirstFix | null>(null);

  const setLocateAction = useNavigationStore((s) => s.setLocateAction);
  const setLocatingStore = useNavigationStore((s) => s.setLocating);
  const setIsTracking = useNavigationStore((s) => s.setIsTracking);
  const setCancelTracking = useNavigationStore((s) => s.setCancelTracking);
  const triggerLocate = useNavigationStore((s) => s.triggerLocate);
  const isTracking = useNavigationStore((s) => s.isTracking);

  const isTrackingRef = useRef(isTracking);
  useEffect(() => {
    isTrackingRef.current = isTracking;
  }, [isTracking]);

  const handleLocateMe = useCallback(() => {
    if (!isGeolocationAvailable()) {
      setLocateError('Geolokacija nije dostupna u ovom pregledniku.');
      return;
    }

    if (isTrackingRef.current) {
      setIsTracking(false);
      setUserLocation(null);
      const cancel = useNavigationStore.getState().cancelTracking;
      if (cancel) {
        cancel();
        setCancelTracking(null);
      }
      return;
    }

    setLocatingStore(true);
    setLocateError(null);

    let firstPos = true;
    // The native watch registers asynchronously (permission prompt), so the id
    // may not exist yet when the user cancels. Track a pending-cancel flag.
    let cancelled = false;
    let watchId: GeoWatchId | null = null;

    void watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setLocatingStore(false);
        setIsTracking(true);

        if (firstPos) {
          triggerLocate();
          firstFixCallbackRef.current?.(latitude, longitude);
          firstPos = false;
        }
      },
      () => {
        setLocateError('Lokacija nije dostupna. Provjerite dozvole preglednika.');
        setLocatingStore(false);
        setIsTracking(false);
        setTimeout(() => setLocateError(null), 4000);
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
    ).then((id) => {
      watchId = id;
      if (cancelled) clearWatch(id);
    });

    const cancel = () => {
      cancelled = true;
      if (watchId !== null) clearWatch(watchId);
    };
    setCancelTracking(cancel);
  }, [setLocatingStore, setIsTracking, setCancelTracking, triggerLocate]);

  useEffect(() => {
    return () => {
      const cancel = useNavigationStore.getState().cancelTracking;
      if (cancel) {
        cancel();
      }
      useNavigationStore.getState().setIsTracking(false);
      useNavigationStore.getState().setCancelTracking(null);
      useNavigationStore.getState().setLocating(false);
    };
  }, []);

  useEffect(() => {
    setLocateAction(handleLocateMe);
    return () => setLocateAction(null);
  }, [handleLocateMe, setLocateAction]);

  const value: GeolocationContextValue = { locateError, userLocation };

  return (
    <FirstFixCallbackRefContext.Provider value={firstFixCallbackRef}>
      <GeolocationContext.Provider value={value}>{children}</GeolocationContext.Provider>
    </FirstFixCallbackRefContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hooks colocated with provider (see GTFSModeContext)
export function useGeolocation(): GeolocationContextValue {
  const ctx = useContext(GeolocationContext);
  if (!ctx) {
    throw new Error(MISSING_PROVIDER);
  }
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components -- hooks colocated with provider (see GTFSModeContext)
export function useRegisterGeolocationFirstFix(callback: LocateFirstFix) {
  const ref = useContext(FirstFixCallbackRefContext);
  if (!ref) {
    throw new Error(MISSING_PROVIDER);
  }
  useLayoutEffect(() => {
    ref.current = callback;
    return () => {
      ref.current = null;
    };
  }, [callback, ref]);
}
