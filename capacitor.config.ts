import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kreni',
  appName: 'Kreni',
  webDir: 'dist',
  // androidScheme defaults to 'https' → secure context, so geolocation and the
  // existing Workbox service worker keep working inside the WebView.
};

export default config;
