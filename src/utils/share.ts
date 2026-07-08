import { Share } from '@capacitor/share';

import { isNative } from './platform';

/**
 * Share the current view. The URL already encodes mode + selection (route / stop
 * / direction via useSelectionParams), so `window.location.href` is the shareable
 * link. Native uses the Android share sheet; web uses the Web Share API, falling
 * back to copying the link to the clipboard.
 */

type ShareResult = 'copied' | 'dismissed' | 'shared';

export async function shareCurrentView(title: string, text: string): Promise<ShareResult> {
  const url = window.location.href;

  if (isNative()) {
    try {
      await Share.share({ text, title, url });
      return 'shared';
    } catch {
      // User cancelled the sheet, or sharing is unavailable.
      return 'dismissed';
    }
  }

  // Web Share API (mobile browsers, some desktops).
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text, title, url });
      return 'shared';
    } catch (err) {
      // AbortError = user dismissed the sheet; anything else → fall back to copy.
      if (err instanceof DOMException && err.name === 'AbortError') return 'dismissed';
    }
  }

  // Clipboard fallback.
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'dismissed';
  }
}
