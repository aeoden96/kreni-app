import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useAppUpdate } from '../../hooks/useAppUpdate';

interface ReleaseNotes {
  version: string;
  force?: boolean;
  changes: string[];
}

export interface UpdatePromptProps {
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
          changes: ['Poboljšanja performansi', 'Nove funkcionalnosti', 'Ispravci grešaka'],
        },
      );
      return;
    }
    fetch(`${import.meta.env.BASE_URL}release-notes.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() as Promise<ReleaseNotes> : null)
      .then((data) => { if (data) setNotes(data); })
      .catch(() => {/* silently ignore */});
  }, [needRefresh, storybook, storybookNotes]);

  // Force-update: auto-apply without user interaction
  useEffect(() => {
    if (needRefresh && notes?.force) {
      updateApp();
    }
  }, [needRefresh, notes, updateApp]);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-sm rounded-xl bg-base-100 border border-base-300 shadow-lg px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <RefreshCw size={16} className="shrink-0 text-primary mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base-content">
            Nova verzija je dostupna
            <span className="ml-1 text-base-content/50 font-normal">({__APP_VERSION__})</span>
          </p>
          {notes?.version === __APP_VERSION__ && notes.changes.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-base-content/60">
              {notes.changes.map((c, i) => (
                <li key={i} className="flex gap-1.5"><span className="shrink-0">·</span>{c}</li>
              ))}
            </ul>
          ) : (
            <ul className="mt-1 space-y-0.5 text-base-content/60">
              <li className="flex gap-1.5"><span className="shrink-0">·</span>Razna poboljšanja i ispravci grešaka</li>
              <li className="flex gap-1.5"><span className="shrink-0">·</span>Bolje performanse aplikacije</li>
            </ul>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="btn btn-ghost btn-circle btn-xs shrink-0"
          aria-label="Zatvori"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={() => setDismissed(true)} className="btn btn-ghost btn-xs">
          Kasnije
        </button>
        <button onClick={updateApp} className="btn btn-primary btn-xs">
          Osvježi
        </button>
      </div>
    </div>
  );
}
