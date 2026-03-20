import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SpiderMenu } from '../components/Navigation/SpiderMenu';
import { UpdatePrompt } from '../components/common/UpdatePrompt';
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
        </div>
    );
}
