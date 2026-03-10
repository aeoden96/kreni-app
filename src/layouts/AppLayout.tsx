import { Outlet } from 'react-router-dom';
import { SpiderMenu } from '../components/Navigation/SpiderMenu';
import { UpdatePrompt } from '../components/common/UpdatePrompt';
import { usePageTracking } from '../hooks/usePageTracking';

export function AppLayout() {
    usePageTracking();
    return (
        <div className="h-svh w-screen overflow-hidden flex flex-col bg-base-100 relative">
            <div className="flex-1 relative overflow-hidden">
                <Outlet />
            </div>
            <SpiderMenu />
            <UpdatePrompt />
        </div>
    );
}
