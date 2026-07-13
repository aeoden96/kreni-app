import type { TFunction } from 'i18next';

import { bearingToCompassKey } from './gtfs';

/** Localized compass direction for a bearing (uses `search.compass.*` keys). */
export function compassLabelForBearing(bearing: number, t: TFunction): string {
  const key = bearingToCompassKey(bearing);
  return t(`search.compass.${key}`);
}
