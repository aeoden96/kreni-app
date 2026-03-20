import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../../hooks/useAppUpdate';

interface ReleaseNotes {
  version: string;
  force?: boolean;
  changes: string[];
}

interface UpdatePromptProps {
  /** Storybook only: when true, shows the banner with mock data (no real hook/fetch). */
  storybook?: boolean;
  /** Storybook only: override mock notes. Omit version or use wrong version to show fallback bullets. */
  storybookNotes?: ReleaseNotes | null;
}

/**
 * Fixed banner shown when a new app version has been downloaded in the
 * background. Prompts the user to reload and apply the update.
 * Fetches release-notes.json (cache-busted) to show what changed.
 */
const noop = () => {};

export function UpdatePrompt({ storybook = false, storybookNotes }: UpdatePromptProps = {}) {
  const { t } = useTranslation();
  const hook = useAppUpdate();
  const needRefresh = storybook || hook.needRefresh;
  const updateApp = storybook ? noop : hook.updateApp;
  const [dismissed, setDismissed] = useState(false);
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);

  useEffect(() => {
    if (!needRefresh) return;
    if (storybook) {
      setNotes(
        storybookNotes ?? {
          version: __APP_VERSION__,
          changes: [t('updatePrompt.storyPerf'), t('updatePrompt.storyFeatures'), t('updatePrompt.storyFixes')],
        },
      );
      return;
    }
    fetch(`${import.meta.env.BASE_URL}release-notes.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<ReleaseNotes> : null)
      .then((data) => { if (data) setNotes(data); })
      .catch(() => {/* silently ignore */});
  }, [needRefresh, storybook, storybookNotes, t]);

  // Force-update: auto-apply without user interaction
  useEffect(() => {
    if (needRefresh && notes?.force) {
      updateApp();
    }
  }, [needRefresh, notes, updateApp]);

  if (!needRefresh || dismissed) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9998] bg-base-content/40 backdrop-blur-[2px]"
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="update-prompt-title"
        className="fixed z-[9999] inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:inset-x-auto sm:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] w-auto sm:w-[min(100%,28rem)] max-w-lg mx-auto safe-left safe-right animate-[modal-fade-in_0.2s_ease-out]"
      >
        <div className="rounded-2xl bg-base-100 border border-base-300 shadow-2xl px-5 py-5 sm:px-6 sm:py-6 max-h-[min(70svh,32rem)] flex flex-col">
          <div className="flex items-start gap-4 min-h-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <RefreshCw size={22} className="text-primary" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 overflow-y-auto pr-1">
              <p id="update-prompt-title" className="text-lg sm:text-xl font-semibold text-base-content leading-snug">
                {t('updatePrompt.title')}
                <span className="block mt-1 text-sm font-normal text-base-content/55">
                  v{__APP_VERSION__}
                </span>
              </p>
              {notes?.version === __APP_VERSION__ && notes.changes.length > 0 ? (
                <ul className="mt-4 space-y-2 text-base text-base-content/70 leading-relaxed">
                  {notes.changes.map((c, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="shrink-0 text-primary font-bold leading-[1.4]">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="mt-4 space-y-2 text-base text-base-content/70 leading-relaxed">
                  <li className="flex gap-2.5">
                    <span className="shrink-0 text-primary font-bold leading-[1.4]">·</span>
                    <span>{t('updatePrompt.fallbackGeneral')}</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="shrink-0 text-primary font-bold leading-[1.4]">·</span>
                    <span>{t('updatePrompt.fallbackPerformance')}</span>
                  </li>
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="btn btn-ghost btn-circle btn-sm shrink-0 touch-target -mr-1 -mt-1"
              aria-label={t('common.close')}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5 sm:mt-6 pt-4 border-t border-base-200 sm:justify-end sm:items-center">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="btn btn-outline border-2 border-base-300 bg-base-200/40 hover:bg-base-200/70 w-full sm:w-auto sm:btn-sm min-h-12 sm:min-h-0 font-medium"
            >
              {t('updatePrompt.later')}
            </button>
            <button
              type="button"
              onClick={updateApp}
              className="btn btn-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 w-full sm:w-auto sm:btn-sm min-h-12 sm:min-h-0 font-semibold transition-[box-shadow,filter]"
            >
              {t('updatePrompt.refreshApp')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
