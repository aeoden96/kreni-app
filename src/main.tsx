import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import './index.css';
import './i18n';
import { SettingsPage } from './components/Settings/SettingsPage.tsx';
import { DebugProvider } from './contexts/DebugContext.tsx';
import { GeolocationProvider } from './contexts/GeolocationProvider.tsx';
import { AppLayout } from './layouts/AppLayout.tsx';
import { CityLifeMode } from './pages/CityLifeMode.tsx';
import { CyclingMode } from './pages/CyclingMode.tsx';
import { DrivingMode } from './pages/DrivingMode.tsx';
import { PublicTransportMode } from './pages/PublicTransportMode.tsx';
import { TallyFeedbackPage } from './pages/TallyFeedbackPage.tsx';
import { TrainMode } from './pages/TrainMode.tsx';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <DebugProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<TallyFeedbackPage />} path="/feedback" />
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
