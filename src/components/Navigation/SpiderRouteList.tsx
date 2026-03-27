import { Bike, Building2, Car, Train, TramFront } from 'lucide-react';
import { Fragment, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { trackEvent } from '../../utils/analytics';
import { SpiderFilterBar } from './SpiderFilterBar';

type RouteConfig = {
  activeIconColor: string;
  activeRing: string;
  icon: React.ReactNode;
  label: string;
  to: string;
};

export function SpiderRouteList() {
  const [, startTransition] = useTransition();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const routes: RouteConfig[] = [
    {
      activeIconColor: 'text-primary',
      activeRing: 'ring-primary',
      icon: <TramFront className="w-5 h-5" />,
      label: t('spiderMenu.modes.transit'),
      to: '/',
    },
    {
      activeIconColor: 'text-red-500',
      activeRing: 'ring-red-500',
      icon: <Train className="w-5 h-5" />,
      label: t('spiderMenu.modes.train'),
      to: '/train',
    },
    {
      activeIconColor: 'text-success',
      activeRing: 'ring-success',
      icon: <Bike className="w-5 h-5" />,
      label: t('spiderMenu.modes.cycling'),
      to: '/cycling',
    },
    {
      activeIconColor: 'text-orange-500',
      activeRing: 'ring-orange-500',
      icon: <Car className="w-5 h-5" />,
      label: t('spiderMenu.modes.driving'),
      to: '/driving',
    },
    {
      activeIconColor: 'text-purple-500',
      activeRing: 'ring-purple-500',
      icon: <Building2 className="w-5 h-5" />,
      label: t('spiderMenu.modes.city'),
      to: '/city',
    },
  ];

  return routes.map((item, index) => {
    const isActive = location.pathname === item.to;

    return (
      // ↓ Fragment replaces the old horizontal `flex items-center gap-3` wrapper.
      //   Each route now occupies its own row; SpiderFilterBar expands below when active.
      <Fragment key={item.to}>
        <NavLink
          className={`flex items-center gap-3 px-4 py-2 rounded-full shadow-xl transition-all duration-300 backdrop-blur-md border border-white/10 animate-spider-reveal bg-neutral/90 hover:bg-neutral ${
            isActive
              ? `ring-2 ${item.activeRing} ring-offset-2 ring-offset-neutral scale-105 text-white`
              : 'text-white/50 hover:text-white/80'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            trackEvent('mode_switched', { mode: item.label });
            startTransition(() => navigate(item.to));
          }}
          style={{ animationDelay: `${index * 50}ms` }}
          to={item.to}
        >
          <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">
            {item.label}
          </span>
          <div
            className={`shrink-0 transition-colors duration-300 ${
              isActive ? item.activeIconColor : ''
            }`}
          >
            {item.icon}
          </div>
        </NavLink>

        {/* ↓ Filter bar now renders BELOW the active item, BEFORE the next inactive ones.
              Only mounted when this route is active — no layout shift on inactive rows. */}
        {isActive && <SpiderFilterBar animationDelay={index * 50 + 50} routePath={item.to} />}
      </Fragment>
    );
  });
}
