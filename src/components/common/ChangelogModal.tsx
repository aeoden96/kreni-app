import { History, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReleaseNotes {
  changes: string[];
  version: string;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const { t } = useTranslation();
  const [changelog, setChangelog] = useState<ReleaseNotes[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}changelog.json?t=${Date.now()}`, { cache: 'no-store' })
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
          <p className="text-[11px] text-base-content/70 italic leading-tight bg-base-200/50 p-2 rounded-lg border border-base-300">
            {t(
              'updatePrompt.englishNote',
              '* Detailed release notes are automatically generated from project commits and are available in English only.'
            )}
          </p>

          {loading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner text-primary" />
            </div>
          ) : changelog.length === 0 ? (
            <p className="text-center text-sm opacity-50 p-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-6">
              {changelog.map((rel) => (
                <div className="space-y-2" key={rel.version}>
                  <h3 className="font-bold text-base text-base-content/90">v{rel.version}</h3>
                  <ul className="space-y-1.5 text-sm text-base-content/70 leading-relaxed pl-1">
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
          )}
        </div>
      </div>
    </div>
  );
}
