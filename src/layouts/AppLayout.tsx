import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { GlobalWelcomeWizard } from '../components/common/GlobalWelcomeWizard';
import { UpdatePrompt } from '../components/common/UpdatePrompt';
import { SpiderMenu } from '../components/Navigation/SpiderMenu';
import { usePageTracking } from '../hooks/usePageTracking';
import { useUrlQueryParams } from '../hooks/useUrlQueryParams';

export function AppLayout() {
  usePageTracking();
  useUrlQueryParams();
  const { t } = useTranslation();
  return (
    <div className="h-svh w-screen overflow-hidden flex flex-col bg-base-100 relative">
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
