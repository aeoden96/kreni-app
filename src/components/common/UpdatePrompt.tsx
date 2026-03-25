import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppUpdate } from '../../hooks/useAppUpdate';

interface ReleaseNotes {
  changes: string[];
  force?: boolean;
  version: string;
}

interface UpdatePromptProps {
  /** Storybook only: when true, shows the banner with mock data (no real hook/fetch). */
  storybook?: boolean;
  /** Storybook only: override mock notes. Omit version or use wrong version to show fallback bullets. */
  storybookNotes?: null | ReleaseNotes;
}

/**
 * Fixed banner shown when a new app version has been downloaded in the
 * background. Prompts the user to reload and apply the update.
 * Fetches changelog.json (cache-busted) to show what changed.
 */
const noop = () => {};

export function UpdatePrompt({ storybook = false, storybookNotes }: UpdatePromptProps = {}) {
  const { t } = useTranslation();
  const hook = useAppUpdate();
  const needRefresh = storybook || hook.needRefresh;
  const updateApp = storybook ? noop : hook.updateApp;
  const [dismissed, setDismissed] = useState(false);
  const [notes, setNotes] = useState<null | ReleaseNotes>(null);
  const [fullChangelog, setFullChangelog] = useState<ReleaseNotes[]>([]);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (!needRefresh) return;
    if (storybook) {
      setNotes(
        storybookNotes ?? {
          changes: [
            t('updatePrompt.storyPerf'),
            t('updatePrompt.storyFeatures'),
            t('updatePrompt.storyFixes'),
          ],
          version: __APP_VERSION__,
        }
      );
      return;
    }
    fetch(`${import.meta.env.BASE_URL}changelog.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<ReleaseNotes[]>) : null))
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setFullChangelog(data);
          // Show the latest release (data[0]) — the version the user is
          // about to update TO.  We can't match __APP_VERSION__ because the
          // running bundle still has the OLD version baked in.
          setNotes(data[0]);
        }
      })
      .catch(() => {
        /* silently ignore */
      });
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
      <div aria-hidden className="fixed inset-0 z-[9998] bg-base-content/40 backdrop-blur-[2px]" />
      <div
        aria-labelledby="update-prompt-title"
        aria-modal="true"
        className="fixed z-[9999] inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:inset-x-auto sm:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] w-auto sm:w-[min(100%,28rem)] max-w-lg mx-auto safe-left safe-right animate-[modal-fade-in_0.2s_ease-out]"
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
            {showFull ? (
              <div className="space-y-4">
                {fullChangelog.map((rel) => (
                  <div className="space-y-1" key={rel.version}>
                    <div className="font-bold text-sm text-base-content/90">v{rel.version}</div>
                    <ul className="space-y-1 text-sm text-base-content/70 leading-relaxed">
                      {rel.changes.map((c, i) => (
                        <li className="flex gap-2" key={i}>
                          <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                          <span>{c}</span>
                        </li>
                      ))}
                      {rel.changes.length === 0 && (
                        <li className="flex gap-2">
                          <span className="shrink-0 text-base-300 font-bold leading-[1.35]">-</span>
                          <span className="italic opacity-60">No specific features logged.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            ) : notes && notes.changes.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed">
                {notes.changes.map((c, i) => (
                  <li className="flex gap-2" key={i}>
                    <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
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

            {!showFull && fullChangelog.length > 0 && (
              <button
                className="mt-3 text-xs text-primary underline hover:text-primary-focus cursor-pointer block"
                onClick={() => setShowFull(true)}
              >
                {t('updatePrompt.seeFullChangelog', 'See full changelog')}
              </button>
            )}
            {showFull && (
              <p className="mt-4 text-[10px] text-base-content/40 italic leading-tight">
                {t(
                  'updatePrompt.englishNote',
                  '* Detailed release notes are automatically generated from project commits and are available in English only.'
                )}
              </p>
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
