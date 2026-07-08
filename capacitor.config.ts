import type { CapacitorConfig } from '@capacitor/cli';

import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  android: {
    // Required by @capacitor-community/background-geolocation: keeps the
    // foreground-service location watch delivering callbacks past the ~5 min
    // mark instead of the modern bridge halting them. We do no background HTTP,
    // so the plugin's WebView-throttle caveat doesn't apply here.
    useLegacyBridge: true,
  },
  appId: 'app.kreni',
  appName: 'Kreni',
  // androidScheme defaults to 'https' → secure context, so geolocation and the
  // existing Workbox service worker keep working inside the WebView.
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Native,
    },
    SplashScreen: {
      backgroundColor: '#102a44', // matches the PWA manifest background_color
      // Held open until React mounts and calls SplashScreen.hide() (see main.tsx),
      // avoiding a white flash between the native splash and the WebView.
      launchAutoHide: false,
      showSpinner: false,
    },
  },
  webDir: 'dist',
};

export default config;
