import { ExternalLink, History, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const { i18n, t } = useTranslation();
  const [changelog, setChangelog] = useState<ReleaseNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}release-notes.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: ReleaseNotes[]) => {
        if (Array.isArray(data)) setChangelog(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-base-300/60 backdrop-blur-3xl"
        onClick={onClose}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />
      <div
        className="relative w-full max-w-lg bg-base-100 rounded-[1rem] shadow-2xl overflow-hidden flex flex-col border border-base-200 h-[80vh] max-h-[40rem]"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        <div className="p-6 pb-4 flex items-center justify-between border-b border-base-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {t('settings.changelogTitle', 'Changelog')}
              </h2>
              <p className="text-sm text-base-content/60">
                {t('settings.appVersion')} {__APP_VERSION__}
              </p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-circle btn-sm"
            onClick={onClose}
            title={t('common.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-base-100/50">
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : changelog.length === 0 ? (
            <p className="text-center text-sm opacity-50 p-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-6">
              {changelog.map((rel) => {
                const lang = i18n.language.slice(0, 2) as 'de' | 'en' | 'hr';
                const notes = rel[lang] || rel.en || rel.hr;

                return (
                  <div className="space-y-2" key={rel.version}>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-base-content/90">v{rel.version}</h3>
                      {notes?.title && (
                        <span className="text-sm text-base-content/60 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          — {notes.title}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed pl-1">
                      {notes?.changes.map((c, i) => (
                        <li className="flex gap-2" key={i}>
                          <span className="shrink-0 text-primary font-bold leading-[1.35]">·</span>
                          <span>{c}</span>
                        </li>
                      ))}
                      {(!notes || notes.changes.length === 0) && (
                        <li className="flex gap-2">
                          <span className="shrink-0 text-base-300 font-bold leading-[1.35]">-</span>
                          <span className="italic opacity-60">No specific features logged.</span>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-base-200 bg-base-100 shrink-0">
          <a
            className="btn btn-outline btn-sm w-full flex items-center justify-center gap-2"
            href="https://github.com/aeoden96/kreni-app/releases"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('updatePrompt.technicalChanges', 'Tehničke promjene')}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
