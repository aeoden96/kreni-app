import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface GlobalAnnouncementData {
  expiresAt?: string;
  id: string;
  link?: string;
  linkText?: string;
  message: string;
  type?: 'error' | 'info' | 'success' | 'warning';
}

export function GlobalAnnouncement() {
  const { t } = useTranslation();

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

  const { data: announcement } = useQuery<GlobalAnnouncementData | null>({
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_GTFS_PROXY_URL}/announcement`);
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

  useEffect(() => {
    localStorage.setItem('dismissedAnnouncements', JSON.stringify(dismissed));
  }, [dismissed]);

  const isExpired = useMemo(() => {
    if (!announcement?.expiresAt) return false;
    return new Date(announcement.expiresAt).getTime() < now;
  }, [announcement?.expiresAt, now]);

  if (!announcement || !announcement.id || !announcement.message) return null;
  if (dismissed.includes(announcement.id)) return null;
  if (isExpired) return null;

  const handleDismiss = () => {
    setDismissed((prev) => [...prev, announcement.id]);
  };

  const getAlertClass = () => {
    switch (announcement.type) {
      case 'error':
        return 'alert-error';
      case 'success':
        return 'alert-success';
      case 'warning':
        return 'alert-warning';
      default:
        return 'bg-primary text-primary-content'; // generic info using primary color
    }
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[2010] flex justify-center w-full px-4 sm:bottom-6 pointer-events-none">
      <div
        className={`alert rounded-2xl shadow-2xl flex flex-row items-center border border-white/20 pointer-events-auto max-w-lg w-full backdrop-blur-md bg-opacity-95 ${getAlertClass()}`}
      >
        <div className="flex-1 flex flex-wrap gap-2 text-sm font-medium pr-2">
          <span>{announcement.message}</span>
          {announcement.link && (
            <a
              className="font-bold underline underline-offset-2 opacity-80 hover:opacity-100 whitespace-nowrap"
              href={announcement.link}
              rel="noopener noreferrer"
              target="_blank"
            >
              {announcement.linkText || t('common.learnMore', 'Learn more')}
            </a>
          )}
        </div>
        <button
          aria-label="Dismiss banner"
          className="btn btn-ghost btn-circle btn-sm p-0 shrink-0 opacity-80 hover:opacity-100"
          onClick={handleDismiss}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
