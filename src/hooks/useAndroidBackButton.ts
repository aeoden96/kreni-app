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
 * plain history-back closes the topmost of them before leaving the screen. At
 * the SPA's first entry we exit the app instead, matching native Android
 * convention.
 *
 * Depth comes from React Router's `history.state.idx`, NOT from Capacitor's
 * `canGoBack`. `canGoBack` also counts the WebView's own pre-SPA entry — the
 * Capacitor origin `http://localhost/` that is loaded before the bundle (or,
 * with live reload, before the dev-server URL). Backing into that entry left the
 * app on a blank page instead of exiting.
 *
 * Extension point: local-state overlays that do NOT push history (layer panels,
 * one-off modals) should be closed here first, ahead of the history-back, once
 * they expose their open state to a store.
 */
export function useAndroidBackButton(): void {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    const backHandle = App.addListener('backButton', () => {
      // Undefined idx means React Router has not pushed anything yet, i.e. we are
      // still on the entry the app launched at — treat it as the root and exit.
      const idx = (window.history.state as null | { idx?: number })?.idx;
      if (typeof idx === 'number' && idx > 0) {
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
