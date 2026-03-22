import type { TFunction } from 'i18next';

/** Localized GTFS-RT `alert.effect` label; falls back to raw `effect` if unknown. */
export function serviceAlertEffectLabel(effect: string, t: TFunction): string {
  const key = `serviceAlert.effects.${effect}`;
  const translated = t(key);
  return translated === key ? effect : translated;
}
