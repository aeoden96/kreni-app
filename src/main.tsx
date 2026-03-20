import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './i18n'
import { AppModeSwitch } from './components/AppModeSwitch'
import { DebugProvider } from './contexts/DebugContext.tsx'
import { SettingsPage } from './components/Settings/SettingsPage.tsx'
import { AppLayout } from './layouts/AppLayout.tsx'
import { CyclingMode } from './pages/CyclingMode.tsx'
import { DrivingMode } from './pages/DrivingMode.tsx'
import { CityLifeMode } from './pages/CityLifeMode.tsx'
import { TrainMode } from './pages/TrainMode.tsx'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<AppModeSwitch />} />
            <Route path="/train" element={<TrainMode />} />
            <Route path="/cycling" element={<CyclingMode />} />
            <Route path="/driving" element={<DrivingMode />} />
            <Route path="/city" element={<CityLifeMode />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DebugProvider>
  </StrictMode>,
)
