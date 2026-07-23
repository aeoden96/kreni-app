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

const queryClient = new QueryClient();

// Native splash is held open (launchAutoHide: false) until the app shell is on
// screen, then dismissed here to avoid a white flash. No-op on web/PWA.
if (isNative()) {
  void SplashScreen.hide();
}

// Register the service worker in autoUpdate mode: a newly deployed build skips
// waiting, activates immediately, and the page hard-reloads on its own. Deploys
// happen during quiet windows, so the automatic reload is acceptable. The
// "updated to vX" toast on the next load is handled by <AppUpdatedToast />.
// Suppressed in the native shell, which updates through the app store.
if (!isNative()) {
  registerSW({ immediate: true });
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
