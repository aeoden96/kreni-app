import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { getTallyFeedbackEmbedSrc, TALLY_FEEDBACK_FORM_ID } from '../config';

/**
 * Full-screen Tally form in an iframe.
 * Use a normal `src` URL: `data-tally-src` is only upgraded by embed.js for static HTML;
 * in React the iframe mounts after that script runs, so the iframe stayed empty.
 */
export function TallyFeedbackPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleBack = () => {
    navigate(-1);
  };

  if (!TALLY_FEEDBACK_FORM_ID) {
    return (
      <div className="h-svh w-screen flex flex-col items-center justify-center gap-4 bg-base-100 p-6 text-center">
        <p className="text-base-content/80 max-w-sm">{t('feedbackPage.unconfigured')}</p>
        <button className="btn btn-primary" onClick={handleBack} type="button">
          {t('common.back')}
        </button>
      </div>
    );
  }

  const tallySrc = getTallyFeedbackEmbedSrc(TALLY_FEEDBACK_FORM_ID);

  return (
    <div className="h-svh w-screen overflow-hidden bg-base-100 flex flex-col">
      {/* pt clears the Android status bar, which the edge-to-edge WebView draws under. */}
      <div className="shrink-0 flex items-center gap-2 p-2 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] border-b border-base-300/50 bg-base-100/95 backdrop-blur-sm z-10">
        <button
          aria-label={t('common.back')}
          className="btn btn-ghost btn-circle btn-sm sm:btn-md"
          onClick={handleBack}
          title={t('common.back')}
          type="button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-base-content truncate pr-2">
          {t('feedbackPage.title')}
        </span>
      </div>
      <div className="flex-1 min-h-0 relative">
        <iframe
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0"
          height="100%"
          marginHeight={0}
          marginWidth={0}
          src={tallySrc}
          title={t('feedbackPage.iframeTitle')}
          width="100%"
        />
      </div>
    </div>
  );
}
