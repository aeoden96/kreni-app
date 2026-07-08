import { Capacitor } from '@capacitor/core';

/**
 * True only when running inside the Capacitor native shell (Android/iOS WebView),
 * false on the web/PWA. The same `dist/` bundle serves both, so every native
 * plugin call must be guarded by this so the web path stays unaffected.
 */
export const isNative = (): boolean => Capacitor.isNativePlatform();
