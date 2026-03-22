import { useTransition } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { TramFront, Bike, Car, Building2, Train } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '../../utils/analytics';
import { SpiderFilterBar } from './SpiderFilterBar';

type RouteConfig = {
    to: string;
    icon: React.ReactNode;
    label: string;
    activeRing: string;
    activeIconColor: string;
};

export function SpiderRouteList() {
    const [, startTransition] = useTransition();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const routes: RouteConfig[] = [
        {
            to: '/',
            icon: <TramFront className="w-5 h-5" />,
            label: t('spiderMenu.modes.transit'),
            activeRing: 'ring-primary',
            activeIconColor: 'text-primary',
        },
        {
            to: '/train',
            icon: <Train className="w-5 h-5" />,
            label: t('spiderMenu.modes.train'),
            activeRing: 'ring-red-500',
            activeIconColor: 'text-red-500',
        },
        {
            to: '/cycling',
            icon: <Bike className="w-5 h-5" />,
            label: t('spiderMenu.modes.cycling'),
            activeRing: 'ring-success',
            activeIconColor: 'text-success',
        },
        {
            to: '/driving',
            icon: <Car className="w-5 h-5" />,
            label: t('spiderMenu.modes.driving'),
            activeRing: 'ring-orange-500',
            activeIconColor: 'text-orange-500',
        },
        {
            to: '/city',
            icon: <Building2 className="w-5 h-5" />,
            label: t('spiderMenu.modes.city'),
            activeRing: 'ring-purple-500',
            activeIconColor: 'text-purple-500',
        },
    ];

    return (
        <>
            {routes.map((item, index) => {
                const isActive = location.pathname === item.to;

                return (
                    <div key={item.to} className="flex items-center gap-3">
                        <SpiderFilterBar routePath={item.to} animationDelay={index * 50 + 50} />
                        <NavLink
                            to={item.to}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                trackEvent('mode_switched', { mode: item.label });
                                startTransition(() => navigate(item.to));
                            }}
                            className={
                                'flex items-center gap-3 px-4 py-2 rounded-full shadow-xl transition-all duration-300 ' +
                                'backdrop-blur-md border border-white/10 animate-spider-reveal ' +
                                'bg-neutral/90 hover:bg-neutral ' +
                                (isActive
                                    ? `ring-2 ${item.activeRing} ring-offset-2 ring-offset-neutral scale-105 text-white`
                                    : 'text-white/50 hover:text-white/80')
                            }
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">
                                {item.label}
                            </span>
                            <div
                                className={`shrink-0 transition-colors duration-300 ${isActive ? item.activeIconColor : ''}`}
                            >
                                {item.icon}
                            </div>
                        </NavLink>
                    </div>
                );
            })}
        </>
    );
}
