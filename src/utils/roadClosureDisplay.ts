import type { TFunction } from 'i18next';

export function roadClosureReasonLabel(reason: string, t: TFunction): string {
  if (reason === 'ROAD_CLOSED_CONSTRUCTION') return t('roadClosures.reasonConstruction');
  if (reason === 'ROAD_CLOSED') return t('roadClosures.reasonClosed');
  return reason;
}

/** ISO 8601 from Zagreb feed → locale date+time, or null if invalid. */
export function formatRoadClosureInstant(iso: string | undefined, locale: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}
