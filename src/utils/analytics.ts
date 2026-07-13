const GA_MEASUREMENT_ID = 'G-C6L98QJ4Z3';

// Extend window with gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, boolean | number | string | undefined>;

export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, {
    ...params,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackPageView(path: string) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_path: path,
    send_to: GA_MEASUREMENT_ID,
  });
}
