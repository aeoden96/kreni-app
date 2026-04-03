import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { GlobalAnnouncement } from '../components/common/GlobalAnnouncement';
import { GlobalWelcomeWizard } from '../components/common/GlobalWelcomeWizard';
import { UpdatePrompt } from '../components/common/UpdatePrompt';
import { SpiderMenu } from '../components/Navigation/SpiderMenu';
import { usePageTracking } from '../hooks/usePageTracking';
import { useUrlQueryParams } from '../hooks/useUrlQueryParams';
import { useSettingsStore } from '../stores/settingsStore';

export function AppLayout() {
  usePageTracking();
  useUrlQueryParams();
  const { t } = useTranslation();

  const globalOnboardingCompleted = useSettingsStore((s) => s.globalOnboardingCompleted);

  // Avoid "wizard flash" on initial render for returning users by waiting
  // for Zustand's persist middleware to rehydrate from localStorage.
  const hasHydrated = (() => {
    const persist = (useSettingsStore as any)?.persist;
    return typeof persist?.hasHydrated === 'function' ? persist.hasHydrated() : true;
  })();

  if (!hasHydrated) {
    return (
      <div className="h-svh w-screen flex items-center justify-center bg-base-100">
        <div className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // Full-screen takeover: block route rendering (and map mount) until onboarding is finished.
  if (!globalOnboardingCompleted) {
    return (
      <div className="h-svh w-screen bg-base-100 relative flex items-center justify-center">
        <GlobalWelcomeWizard />
      </div>
    );
  }

  return (
    <div className="h-svh w-screen overflow-hidden flex flex-col bg-base-100 relative">
      <GlobalAnnouncement />
      <h1 className="sr-only">{t('app.title')}</h1>
      <div className="flex-1 relative overflow-hidden">
        <Outlet />
      </div>
      <SpiderMenu />
      <UpdatePrompt />
      <GlobalWelcomeWizard />
    </div>
  );
}
