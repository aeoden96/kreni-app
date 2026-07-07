import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';

import { isNative } from '../utils/platform';

/**
 * Live online/offline status. Native uses `@capacitor/network`; web uses
 * `navigator.onLine` + the `online`/`offline` window events. Starts optimistic
 * (`true`) so the offline banner never flashes before the first real reading.
 */
export function useNetworkStatus(): { online: boolean } {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (isNative()) {
      void Network.getStatus().then((s) => {
        if (!cancelled) setOnline(s.connected);
      });
      const handle = Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
      return () => {
        cancelled = true;
        void handle.then((h) => h.remove());
      };
    }

    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { online };
}
