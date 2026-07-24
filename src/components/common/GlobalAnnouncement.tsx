/**
 * Site-wide announcement.
 *
 * Content comes from the `global-announcement` KV key (set by the
 * `Global Announcement` workflow in kreni-core) via the proxy's /announcement
 * endpoint. Each announcement carries an `id`; dismissals are stored per id, so
 * a reader sees any given announcement once and a new one always gets through.
 *
 * This owns fetching, expiry and dismissal — <AnnouncementModal> owns the
 * layout.
 *
 * To preview one locally, run this in the browser console and reload:
 *
 *   localStorage.setItem('devAnnouncement', JSON.stringify({
 *     id: String(Date.now()),        // a fresh id each time, so it is never pre-dismissed
 *     type: 'warning',               // info | warning | error | success
 *     message: 'Tram 6 is diverted until Sunday.',
 *     image: 'https://media.giphy.com/media/xyz/giphy.gif',   // optional
 *     imageAlt: '',                  // optional
 *     link: 'https://www.zet.hr/',   // optional
 *     linkText: 'Read the notice',   // optional
 *   }))
 *
 * `localStorage.removeItem('devAnnouncement')` goes back to the live one. The
 * override replaces only the payload — expiry and dismissal behave exactly as
 * in production, so what you see is what a reader gets. Dev builds only.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AnnouncementType } from './AnnouncementModal';

import { GTFS_API_KEY, GTFS_PROXY_URL } from '../../config';
import { AnnouncementModal } from './AnnouncementModal';

interface GlobalAnnouncementData {
  expiresAt?: string;
  id: string;
  image?: null | string;
  imageAlt?: null | string;
  link?: null | string;
  linkText?: null | string;
  message: string;
  type?: AnnouncementType;
}

export function GlobalAnnouncement() {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('dismissedAnnouncements');
      if (!stored) return [];
      return JSON.parse(stored) as string[];
    } catch {
      return [];
    }
  });

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Update 'now' every minute so it continues to evaluate correctly
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Read once: a preview should not change under you while you are looking at it.
  const [devAnnouncement] = useState(readDevAnnouncement);

  const { data: fetched } = useQuery<GlobalAnnouncementData | null>({
    // No point hitting the network when a local payload is already overriding it.
    enabled: !devAnnouncement,
    queryFn: async () => {
      if (!GTFS_PROXY_URL) return null;

      const headers: Record<string, string> = {};
      if (GTFS_API_KEY) {
        headers['X-API-Key'] = GTFS_API_KEY;
      }

      const res = await fetch(`${GTFS_PROXY_URL}/announcement`, { headers });
      if (!res.ok) return null;
      try {
        const json = await res.json();
        return json;
      } catch {
        return null;
      }
    },
    queryKey: ['globalAnnouncement'],
    // Check every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  const announcement = devAnnouncement ?? fetched;

  useEffect(() => {
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
  }, [dismissed]);

  const isExpired = useMemo(() => {
    if (!announcement?.expiresAt) return false;
    return new Date(announcement.expiresAt).getTime() < now;
  }, [announcement?.expiresAt, now]);

  const announcementId = announcement?.id;
  const handleDismiss = useCallback(() => {
    if (!announcementId) return;
    setDismissed((prev) => (prev.includes(announcementId) ? prev : [...prev, announcementId]));
  }, [announcementId]);

  if (!announcement?.id || !announcement.message) return null;
  if (dismissed.includes(announcement.id) || isExpired) return null;

  return (
    <AnnouncementModal
      announcement={announcement}
      labelId={`announcement-${announcement.id}`}
      onDismiss={handleDismiss}
    />
  );
}

/**
 * Local preview payload, read once on mount. Guarded by `import.meta.env.DEV`,
 * so the whole branch is dropped from a production build.
 */
function readDevAnnouncement(): GlobalAnnouncementData | null {
  if (!import.meta.env.DEV) return null;
  try {
    const raw = localStorage.getItem('devAnnouncement');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GlobalAnnouncementData;
    return parsed.id && parsed.message ? parsed : null;
  } catch {
    return null;
  }
}
