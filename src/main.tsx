import { SplashScreen } from '@capacitor/splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';

import './index.css';
import './i18n';
import { SettingsPage } from './components/Settings/SettingsPage.tsx';
import { DebugProvider } from './contexts/DebugContext.tsx';
import { GeolocationProvider } from './contexts/GeolocationProvider.tsx';
import { AppLayout } from './layouts/AppLayout.tsx';
import { CityLifeMode } from './pages/CityLifeMode.tsx';
import { CyclingMode } from './pages/CyclingMode.tsx';
import { DrivingMode } from './pages/DrivingMode.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { PublicTransportMode } from './pages/PublicTransportMode.tsx';
import { TallyFeedbackPage } from './pages/TallyFeedbackPage.tsx';
import { TrainMode } from './pages/TrainMode.tsx';
import { isNative } from './utils/platform.ts';
import { retireOldCaches } from './utils/retireCaches.ts';
import { startSwUpdateChecks } from './utils/swUpdate.ts';

const queryClient = new QueryClient();

// Reclaims the pre-CORS tile caches, whose opaque entries are padded to several
// megabytes each in quota accounting. Runs before render because it is a couple
// of `caches` calls and never blocks — see the module for the measurements.
retireOldCaches();

// Native splash is held open (launchAutoHide: false) until the app shell is on
// screen, then dismissed here to avoid a white flash. No-op on web/PWA.
if (isNative()) {
  void SplashScreen.hide();
}

// Register the service worker in autoUpdate mode: once a new build is *found*
// it skips waiting, activates, and vite-plugin-pwa reloads the page on its own.
// Deploys happen during quiet windows, so the automatic reload is acceptable.
// The "updated to vX" toast on the next load is handled by <AppUpdatedToast />.
//
// autoUpdate does not look for that build, though — the browser only re-checks
// on a navigation or its ~24h timer, which never fires for an open tab or a
// resumed PWA. startSwUpdateChecks supplies the missing trigger.
//
// Suppressed in the native shell, which updates through the app store.
if (!isNative()) {
  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (registration) startSwUpdateChecks(swUrl, registration);
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DebugProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<TallyFeedbackPage />} path="/feedback" />
            <Route element={<PrivacyPage />} path="/privacy" />
            <Route
              element={
                <GeolocationProvider>
                  <AppLayout />
                </GeolocationProvider>
              }
            >
              <Route element={<PublicTransportMode />} path="/" />
              <Route element={<TrainMode />} path="/train" />
              <Route element={<CyclingMode />} path="/cycling" />
              <Route element={<DrivingMode />} path="/driving" />
              <Route element={<CityLifeMode />} path="/city" />
              <Route element={<SettingsPage />} path="/settings" />
            </Route>
          </Routes>
        </BrowserRouter>
      </DebugProvider>
    </QueryClientProvider>
  </StrictMode>
);
