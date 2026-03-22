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
    onRegisteredSW(swUrl) {
      console.log('[SW] registered:', swUrl);
    },
    onNeedRefresh() {
      console.log('[SW] new version waiting — showing update prompt');
    },
    onRegisterError(error) {
      console.error('[SW] registration error:', error);
    },
  });

  // Append ?update to the URL to force the banner visible for UI testing,
  // e.g. http://localhost:5173/?update or http://localhost:4173/?update
  const devForceShow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('update');

  return {
    needRefresh: needRefresh || devForceShow,
    updateApp: () => updateServiceWorker(true),
  };
}
