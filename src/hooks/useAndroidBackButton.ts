import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { isNative } from '../utils/platform';

/**
 * Wires the Android hardware/gesture Back button and https App Links into the
 * SPA. No-op on web/PWA. Mount once from AppLayout (inside the Router).
 *
 * Back behavior: route changes (modes) and selections (route/stop sheets) all
 * push history entries — see `useSelectionParams` (`{ replace: false }`) — so a
 * plain history-back closes the topmost of them before leaving the screen. Only
 * when the WebView reports no further history (`canGoBack === false`, i.e. the
 * launch screen) do we exit the app, matching native Android convention.
 *
 * Extension point: local-state overlays that do NOT push history (layer panels,
 * one-off modals) should be closed here first, ahead of the history-back, once
 * they expose their open state to a store.
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    const backHandle = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        void App.exitApp();
      }
    });

    const urlHandle = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      // App Links: https://kreni.app/<path> → route within the SPA.
      try {
        const url = new URL(event.url);
        navigate(`${url.pathname}${url.search}${url.hash}` || '/');
      } catch {
        // Non-http(s) custom-scheme links are not routed here.
      }
    });

    return () => {
      void backHandle.then((h) => h.remove());
      void urlHandle.then((h) => h.remove());
    };
  }, [navigate]);
}
