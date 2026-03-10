import { Outlet } from 'react-router-dom';
import { SpiderMenu } from '../components/Navigation/SpiderMenu';
import { UpdatePrompt } from '../components/common/UpdatePrompt';
import { CacheSizeIndicator } from '../components/common/CacheSizeIndicator';

export function AppLayout() {
    return (
        <div className="h-svh w-screen overflow-hidden flex flex-col bg-base-100 relative">
            <div className="flex-1 relative overflow-hidden">
                <Outlet />
            </div>
            {/* 
                SpiderMenu is global. On the Map page (/), it will also show 
                the Locate button because we'll pass props from App.tsx 
                or handle it via route checking if we move it.
                Actually, let's keep it here but we'll need a way for App.tsx 
                to 'register' its locate function.
            */}
            <SpiderMenu />
            <UpdatePrompt />
            <CacheSizeIndicator />
        </div>
    );
}
