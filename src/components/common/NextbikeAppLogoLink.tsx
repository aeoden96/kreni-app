import { useTranslation } from 'react-i18next';

import { NEXTBIKE_APP_BASE_URL, NEXTBIKE_APP_LOGO_URL } from '../../utils/nextbikeAppLinks';

interface NextbikeAppLogoLinkProps {
  className?: string;
  imgClassName?: string;
}

export function NextbikeAppLogoLink({
  className = '',
  imgClassName = 'h-11 w-11',
}: NextbikeAppLogoLinkProps) {
  const { t } = useTranslation();

  return (
    <a
      aria-label={t('cyclingMode.nextbikeOpenAppAria')}
      className={`relative z-10 inline-flex shrink-0 leading-none rounded-lg bg-base-100 shadow-md ring-1 ring-base-300/60 transition hover:ring-nextbike/55 hover:brightness-[1.02] ${className}`}
      href={NEXTBIKE_APP_BASE_URL}
      rel="noopener noreferrer"
      target="_blank"
      title={t('cyclingMode.nextbikeOpenApp')}
    >
      <img
        alt=""
        className={`block rounded-lg object-contain ${imgClassName}`}
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={NEXTBIKE_APP_LOGO_URL}
      />
    </a>
  );
}
