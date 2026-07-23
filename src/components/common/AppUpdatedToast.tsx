import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'lastAppVersion';
const VISIBLE_MS = 2000;
const FADE_MS = 300;

/**
 * Small transient toast shown once after the app has auto-updated to a new
 * build. Decoupled from the service worker: on mount it compares the current
 * build's version (`__APP_VERSION__`) against the last version persisted in
 * localStorage. If it changed — and this isn't the first-ever load — it shows
 * "App updated to vX" for a couple of seconds, then fades out. The first load
 * (no stored value) records the version silently without a toast.
 */
export function AppUpdatedToast() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // Whether to show the toast, decided exactly once. Caching it (rather than
  // re-reading localStorage) keeps the decision stable across StrictMode's
  // double effect invocation — the localStorage write happens on the first run,
  // so a re-read on the second run would wrongly conclude "no change".
  const shouldShowRef = useRef<'pending' | boolean>('pending');

  useEffect(() => {
    if (shouldShowRef.current === 'pending') {
      let previous: null | string = null;
      try {
        previous = localStorage.getItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, __APP_VERSION__);
      } catch {
        // localStorage unavailable (private mode / disabled) — skip the toast.
        shouldShowRef.current = false;
        return;
      }
      // Only surface the toast on an actual version change, never on first load.
      shouldShowRef.current = previous !== null && previous !== __APP_VERSION__;
    }

    if (!shouldShowRef.current) return;

    setVisible(true);
    setLeaving(false);
    const fadeTimer = setTimeout(() => setLeaving(true), VISIBLE_MS);
    const hideTimer = setTimeout(() => setVisible(false), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[2030] flex justify-center px-4 top-[calc(env(safe-area-inset-top,0px)+2.5rem+30px)]"
      role="status"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/20 bg-neutral/95 px-4 py-2.5 text-sm font-medium text-neutral-content shadow-2xl backdrop-blur-md transition-opacity duration-300 ${
          leaving ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <CheckCircle2 aria-hidden className="h-4 w-4 shrink-0 text-primary" />
        <span>{t('appUpdated.toast', { version: __APP_VERSION__ })}</span>
      </div>
    </div>
  );
}
