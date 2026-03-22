import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigationStore } from '../stores/navigationStore';

export function useGeolocation(onSuccess?: (lat: number, lon: number) => void) {
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [locateError, setLocateError] = useState<string | null>(null);

    const setLocateAction = useNavigationStore(s => s.setLocateAction);
    const setLocatingStore = useNavigationStore(s => s.setLocating);
    const setIsTracking = useNavigationStore(s => s.setIsTracking);
    const setCancelTracking = useNavigationStore(s => s.setCancelTracking);
    const triggerLocate = useNavigationStore(s => s.triggerLocate);
    const isTracking = useNavigationStore(s => s.isTracking);

    const isTrackingRef = useRef(isTracking);
    useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]);

    const handleLocateMe = useCallback(() => {
        if (!navigator.geolocation) {
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

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setUserLocation({ lat: latitude, lon: longitude });
                setLocatingStore(false);
                setIsTracking(true);

                if (firstPos) {
                    triggerLocate();
                    if (onSuccess) onSuccess(latitude, longitude);
                    firstPos = false;
                }
            },
            () => {
                setLocateError('Lokacija nije dostupna. Provjerite dozvole preglednika.');
                setLocatingStore(false);
                setIsTracking(false);
                setTimeout(() => setLocateError(null), 4000);
            },
            { timeout: 8000, maximumAge: 30000, enableHighAccuracy: true }
        );

        const cancel = () => navigator.geolocation.clearWatch(watchId);
        setCancelTracking(cancel);
    }, [setLocatingStore, onSuccess, setIsTracking, setCancelTracking, triggerLocate]);

    useEffect(() => {
        return () => {
            const cancel = useNavigationStore.getState().cancelTracking;
            if (cancel) {
                cancel();
            }
            useNavigationStore.getState().setIsTracking(false);
            useNavigationStore.getState().setCancelTracking(null);
        };
    }, []);

    useEffect(() => {
        setLocateAction(handleLocateMe);
        return () => setLocateAction(null);
    }, [handleLocateMe, setLocateAction]);

    return {
        userLocation,
        setUserLocation,
        locateError
    };
}
