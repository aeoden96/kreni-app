import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { trackPageView } from '../utils/analytics';

export function usePageTracking() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    trackPageView(location.pathname);
  }, [location.pathname]);
}
