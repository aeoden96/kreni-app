import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Detects when a new service worker has installed and is waiting to take over.
 * Returns a flag and a function to reload into the updated version.
 *
 * Dev tip: append ?update to the URL to force the banner visible for UI testing,
 * e.g. http://localhost:4173/?update
 */
export function useAppUpdate() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[SW] new version waiting — showing update prompt');
    },
    onRegisteredSW(swUrl) {
      console.log('[SW] registered:', swUrl);
    },
    onRegisterError(error) {
      console.error('[SW] registration error:', error);
    },
  });

  // Nudge the browser to fetch a new service worker when the user returns to
  // the app (default SW update checks can be slow).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const checkForNewWorker = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForNewWorker();
    };

    window.addEventListener('focus', checkForNewWorker);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('focus', checkForNewWorker);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Append ?update to the URL to force the banner visible for UI testing,
  // e.g. http://localhost:5173/?update or http://localhost:4173/?update
  const devForceShow =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('update');

  return {
    needRefresh: needRefresh || devForceShow,
    updateApp: () => updateServiceWorker(true),
  };
}
