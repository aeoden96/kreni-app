/**
 * The announcement modal itself — presentation only.
 *
 * Split from <GlobalAnnouncement>, which owns fetching, expiry and dismissal
 * state, so the layout can be previewed in Storybook without a live payload.
 *
 * The optional image leads: announcements carry diversion maps, event posters
 * and feature clips, which a thumbnail beside the text would waste. With no
 * image this is a compact text card — there is no empty hero.
 */

import { AlertTriangle, CheckCircle2, ExternalLink, Info, OctagonAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { safeUrl } from '../../utils/safeUrl';

export interface AnnouncementContent {
  /** Optional image or GIF, shown full-bleed above the message. */
  image?: null | string;
  /** Alt text for `image`. Empty means decorative — the message carries the content. */
  imageAlt?: null | string;
  link?: null | string;
  linkText?: null | string;
  message: string;
  type?: AnnouncementType;
}

export type AnnouncementType = 'error' | 'info' | 'success' | 'warning';

interface AnnouncementModalProps {
  announcement: AnnouncementContent;
  /** Ties the message to the dialog for assistive tech; use the announcement id. */
  labelId: string;
  onDismiss: () => void;
}

/** Accent, icon and eyebrow per type — the one place `type` becomes design. */
const PRESENTATION: Record<
  AnnouncementType,
  { accent: string; eyebrowKey: string; icon: typeof Info }
> = {
  error: { accent: 'text-error', eyebrowKey: 'announcement.eyebrowError', icon: OctagonAlert },
  info: { accent: 'text-primary', eyebrowKey: 'announcement.eyebrowInfo', icon: Info },
  success: {
    accent: 'text-success',
    eyebrowKey: 'announcement.eyebrowSuccess',
    icon: CheckCircle2,
  },
  warning: {
    accent: 'text-warning',
    eyebrowKey: 'announcement.eyebrowWarning',
    icon: AlertTriangle,
  },
};

export function AnnouncementModal({ announcement, labelId, onDismiss }: AnnouncementModalProps) {
  const { t } = useTranslation();
  // A remote URL that 404s or is blocked must not leave a broken-image box in
  // the hero, so a failed load drops the image entirely.
  const [imageFailed, setImageFailed] = useState(false);
  const dismissRef = useRef<HTMLButtonElement>(null);

  // Escape closes, the page behind must not scroll, and focus moves into the
  // dialog so a keyboard reader is not left stranded behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    dismissRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onDismiss]);

  const { accent, eyebrowKey, icon: Icon } = PRESENTATION[announcement.type ?? 'info'];
  const image = imageFailed ? null : safeUrl(announcement.image);
  const link = safeUrl(announcement.link);

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-base-300/60 backdrop-blur-3xl"
        onClick={onDismiss}
        style={{ animation: 'backdrop-fade-in 0.15s ease-out' }}
      />

      <div
        aria-labelledby={labelId}
        aria-modal="true"
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[1rem] border border-base-200 bg-base-100 shadow-2xl"
        role="dialog"
        style={{ animation: 'modal-fade-in 0.2s ease-out' }}
      >
        {/* Close floats over the image when there is one, so the hero keeps the full width. */}
        <button
          aria-label={t('common.close')}
          className={`btn btn-circle btn-sm absolute right-3 top-3 z-10 border-none ${
            image ? 'bg-base-100/80 text-base-content backdrop-blur hover:bg-base-100' : 'btn-ghost'
          }`}
          onClick={onDismiss}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>

        {image && (
          // object-contain, not cover: these are often maps and posters, where
          // cropping removes exactly the part the reader needs.
          <img
            alt={announcement.imageAlt ?? ''}
            className="max-h-[45vh] w-full shrink-0 bg-base-200 object-contain"
            onError={() => setImageFailed(true)}
            src={image}
          />
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain p-6">
          <div className={`flex items-center gap-2 ${accent}`}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">{t(eyebrowKey)}</span>
          </div>

          <p
            className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-base-content/90"
            id={labelId}
          >
            {announcement.message}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-base-200 px-6 py-4">
          {link && (
            // No dismiss here: the link opens in a new tab, so the reader comes
            // back to a modal they have not finished with. Only "Got it", the X,
            // Escape and the backdrop count as "I'm done with this".
            <a
              className="btn btn-ghost btn-sm gap-1.5"
              href={link}
              rel="noopener noreferrer"
              target="_blank"
            >
              {announcement.linkText || t('common.learnMore')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            className="btn btn-primary btn-sm px-5"
            onClick={onDismiss}
            ref={dismissRef}
            type="button"
          >
            {t('announcement.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
