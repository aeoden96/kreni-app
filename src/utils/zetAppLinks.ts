/**
 * Official “Moj ZET” app (ZET). Deep-link hosts (api.zet.hr) return 403 in a normal browser;
 * we route taps to Play / App Store or an Android intent with Play Store fallback instead.
 */
export const ZET_ANDROID_PACKAGE = 'com.zetmobile';

export const ZET_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.zetmobile';

export const ZET_APP_STORE_URL = 'https://apps.apple.com/hr/app/moj-zet/id6447687095';

const ZET_DEEP_LINK_HOST_PROD = 'api.zet.hr';
const ZET_DEEP_LINK_HOST_UAT = 'uat-api.zet.hr';

const override = import.meta.env.VITE_ZET_APP_DEEP_LINK_URL;

/** Canonical HTTPS deep-link origin (403 in browser; useful for docs / overrides only). */
export const ZET_APP_BASE_URL =
  override && override.length > 0
    ? override
    : import.meta.env.PROD
      ? `https://${ZET_DEEP_LINK_HOST_PROD}/`
      : `https://${ZET_DEEP_LINK_HOST_UAT}/`;

/** Play Store listing artwork (app icon), used as the tap target for opening ZET. */
export const ZET_APP_LOGO_URL =
  'https://play-lh.googleusercontent.com/cLt4CULMUPNLyVFWPNJ4HpNU3vnQ_5MPAjfJPwvg6PTO9cjcSIPXDBQEufyYTQ1GMYY';

export type ZetAppLinkProps = {
  href: string;
  /** Use same-tab navigation on mobile so Android intent: URLs behave reliably. */
  target: '_blank' | undefined;
};

/**
 * Resolves where the logo link should go: Android intent (app or Play fallback), iOS App Store,
 * desktop Play Store in a new tab. Optional env override keeps previous deep-link behaviour (may 403 in browser).
 */
export function getZetAppLink(userAgent: string): ZetAppLinkProps {
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  if (override && override.length > 0) {
    return {
      href: override,
      target: isAndroid || isIOS ? undefined : '_blank',
    };
  }

  if (isAndroid) {
    const host = import.meta.env.PROD ? ZET_DEEP_LINK_HOST_PROD : ZET_DEEP_LINK_HOST_UAT;
    const fallback = encodeURIComponent(ZET_PLAY_STORE_URL);
    return {
      href: `intent://${host}/#Intent;scheme=https;package=${ZET_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`,
      target: undefined,
    };
  }

  if (isIOS) {
    return { href: ZET_APP_STORE_URL, target: undefined };
  }

  return { href: ZET_PLAY_STORE_URL, target: '_blank' };
}
