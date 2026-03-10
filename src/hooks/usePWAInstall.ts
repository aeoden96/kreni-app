import { useState, useEffect } from 'react';
import { trackEvent } from '../utils/analytics';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures the browser's `beforeinstallprompt` event so the app can show a
 * custom install button instead of relying on the browser's default prompt.
 *
 * `canInstall` is true only when the browser deems the PWA installable and the
 * user hasn't already installed it (or dismissed a previous prompt).
 *
 * Usage:
 *   const { canInstall, install } = usePWAInstall();
 */
export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // suppress the mini-infobar so we control the UX
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    trackEvent('pwa_install_outcome', { outcome });
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return {
    /** True when the browser has a deferred install prompt ready */
    canInstall: !!installPrompt && !isInstalled,
    install,
  };
}
