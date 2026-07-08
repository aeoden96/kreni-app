import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppUpdate } from '../../hooks/useAppUpdate';
import { isNative } from '../../utils/platform';

interface LocalizedNotes {
  changes: string[];
  title: string;
}

interface ReleaseNotes {
  de: LocalizedNotes;
  en: LocalizedNotes;
  force?: boolean;
  hr: LocalizedNotes;
  version: string;
}

interface UpdatePromptProps {
  /** Storybook only: when true, shows the banner with mock data (no real hook/fetch). */
  storybook?: boolean;
  storybookNotes?: null | ReleaseNotes;
}

/**
 * Fixed banner shown when a new app version has been downloaded in the
 * background. Prompts the user to reload and apply the update.
 * Fetches changelog.json (cache-busted) to show what changed.
 */
const noop = () => {};

export function UpdatePrompt({ storybook = false, storybookNotes }: UpdatePromptProps = {}) {
  const { i18n, t } = useTranslation();
  const hook = useAppUpdate();
  // In the native shell the app updates through the store, so the SW "update
  // available" prompt (and its forced auto-apply below) is suppressed — the
  // service worker itself keeps running for offline caching. Storybook still
  // renders the banner for UI review.
  const needRefresh = storybook || (hook.needRefresh && !isNative());
  const updateApp = storybook ? noop : hook.updateApp;
  const [dismissed, setDismissed] = useState(false);
  const [notes, setNotes] = useState<null | ReleaseNotes>(null);
  /** False until release-notes fetch finishes (or storybook notes are set). Avoids flashing the modal before we know `force`. */
  const [notesResolved, setNotesResolved] = useState(false);

  useEffect(() => {
    if (!needRefresh) {
      setNotes(null);
      setNotesResolved(false);
      return;
    }
    if (storybook) {
      setNotes(
        storybookNotes ?? {
          de: { changes: [t('updatePrompt.storyPerf')], title: 'Neues Update' },
          en: { changes: [t('updatePrompt.storyPerf')], title: 'New Update' },
          hr: { changes: [t('updatePrompt.storyPerf')], title: 'Novo ažuriranje' },
          version: __APP_VERSION__,
        }
      );
      setNotesResolved(true);
      return;
    }

    let cancelled = false;
    setNotesResolved(false);

    fetch(`${import.meta.env.BASE_URL}release-notes.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<ReleaseNotes[]>) : null))
      .then((data) => {
        if (cancelled) return;
        if (data && Array.isArray(data) && data.length > 0) {
          // Show the latest release (data[0]) — the version the user is
          // about to update TO.
          setNotes(data[0]);
        } else {
          setNotes(null);
        }
      })
      .catch(() => {
        if (!cancelled) setNotes(null);
      })
      .finally(() => {
        if (!cancelled) setNotesResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [needRefresh, storybook, storybookNotes, t]);

  // Force-update: auto-apply without user interaction
  useEffect(() => {
    if (!needRefresh || !notesResolved || storybook) return;
    if (notes?.force) {
      updateApp();
    }
  }, [needRefresh, notes, notesResolved, storybook, updateApp]);

  if (!needRefresh || dismissed) return null;

  // Do not show the dialog until we know whether this release is forced (prevents a 1–2s flash).
  if (!storybook && !notesResolved) return null;
  if (!storybook && notes?.force) return null;

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-[9998] bg-base-content/40 backdrop-blur-[2px]" />
      <div
        aria-labelledby="update-prompt-title"
        aria-modal="true"
        className="fixed z-[9999] inset-x-4 top-[calc(1rem+env(safe-area-inset-top,0px))] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:inset-x-auto sm:top-8 w-auto sm:w-[min(100%,28rem)] max-w-lg mx-auto safe-left safe-right animate-[modal-fade-in_0.2s_ease-out]"
        role="alertdialog"
      >
        <div className="rounded-2xl bg-base-100 border border-base-300 shadow-2xl px-5 py-5 sm:px-6 sm:py-6 max-h-[min(70svh,32rem)] flex flex-col overflow-hidden">
          {/* HEADER ROW (Fixed) */}
          <div className="flex shrink-0 items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <RefreshCw aria-hidden className="text-primary" size={20} />
            </div>
            <div className="flex-1 min-w-0 mt-0.5">
              <p
                className="text-base sm:text-lg font-semibold text-base-content leading-snug"
                id="update-prompt-title"
              >
                {t('updatePrompt.title')}
                <span className="block mt-0.5 text-xs font-normal text-base-content/55">
                  v{notes?.version ?? __APP_VERSION__}
                </span>
              </p>
            </div>
            <button
              aria-label={t('common.close')}
              className="btn btn-ghost btn-circle btn-sm shrink-0 touch-target -mr-1 -mt-1"
              onClick={() => setDismissed(true)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          {/* CONTENT ROW (Scrollable) - Offset by pl-14 to align with text */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-3 pl-14 pr-1 -mr-0.5 [scrollbar-gutter:stable] pb-1">
            {notes ? (
              (() => {
                // Fallback safely to English or Croatian
                const lang = i18n.language.slice(0, 2) as 'de' | 'en' | 'hr';
                const currentNotes = notes[lang] || notes.en || notes.hr;

                if (!currentNotes || currentNotes.changes.length === 0) {
                  return (
                    <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed">
                      <li className="flex gap-2">
                        <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                        <span>{t('updatePrompt.fallbackGeneral')}</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                        <span>{t('updatePrompt.fallbackPerformance')}</span>
                      </li>
                    </ul>
                  );
                }
                return (
                  <div className="space-y-3">
                    {currentNotes.title && (
                      <p className="font-semibold text-sm text-base-content/90">
                        {currentNotes.title}
                      </p>
                    )}
                    <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed">
                      {currentNotes.changes.map((c, i) => (
                        <li className="flex gap-2" key={i}>
                          <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()
            ) : (
              <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed">
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                  <span>{t('updatePrompt.fallbackGeneral')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                  <span>{t('updatePrompt.fallbackPerformance')}</span>
                </li>
              </ul>
            )}
          </div>

          {/* FOOTER ROW (Fixed) */}
          <div className="shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-base-200 sm:justify-end sm:items-center">
            <button
              className="btn btn-outline border-2 border-base-300 bg-base-200/40 hover:bg-base-200/70 w-full sm:w-auto sm:btn-sm min-h-12 sm:min-h-0 font-medium"
              onClick={() => setDismissed(true)}
              type="button"
            >
              {t('updatePrompt.later')}
            </button>
            <button
              className="btn btn-primary shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 w-full sm:w-auto sm:btn-sm min-h-12 sm:min-h-0 font-semibold transition-[box-shadow,filter]"
              onClick={updateApp}
              type="button"
            >
              {t('updatePrompt.refreshApp')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
