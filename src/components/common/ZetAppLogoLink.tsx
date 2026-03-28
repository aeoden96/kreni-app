import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getZetAppLink, ZET_APP_LOGO_URL } from '../../utils/zetAppLinks';

interface ZetAppLogoLinkProps {
  className?: string;
  imgClassName?: string;
}

export function ZetAppLogoLink({
  className = 'inline-flex shrink-0 rounded-lg bg-base-100 shadow-md ring-1 ring-base-300/60 transition hover:ring-primary/55 hover:brightness-[1.02]',
  imgClassName = 'h-11 w-11 rounded-lg',
}: ZetAppLogoLinkProps) {
  const { t } = useTranslation();
  const { href, target } = useMemo(
    () => getZetAppLink(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    []
  );

  return (
    <a
      aria-label={t('gtfs.zetOpenAppAria')}
      className={`relative z-10 leading-none ${className}`}
      href={href}
      rel="noopener noreferrer"
      target={target}
      title={t('gtfs.zetOpenApp')}
    >
      <img
        alt=""
        className={`block object-contain ${imgClassName}`}
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={ZET_APP_LOGO_URL}
      />
    </a>
  );
}
