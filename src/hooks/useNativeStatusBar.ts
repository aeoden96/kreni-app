import { StatusBar, Style } from '@capacitor/status-bar';
import { useEffect } from 'react';

import { useSettingsStore } from '../stores/settingsStore';
import { isNative } from '../utils/platform';

/**
 * Keeps the Android status bar in sync with the app theme. No-op on web/PWA.
 * Mount once from AppLayout.
 *
 * Under Android 15 edge-to-edge the bar is transparent and `setBackgroundColor`
 * is a no-op — the app's own `.safe-top` padding paints the color band behind
 * it — so we only drive icon contrast via `setStyle`. `Style.Dark` = light
 * icons (for our dark UI), `Style.Light` = dark icons (for the light UI).
 */
export function useNativeStatusBar(): void {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    if (!isNative()) return;
    void StatusBar.setOverlaysWebView({ overlay: true });
    void StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
  }, [theme]);
}
