import type { TFunction } from 'i18next';
import type { ReactNode } from 'react';

import type { BajsStation } from '../../../../hooks/useNextbikeData';

import { firstNumberProp, firstStringProp } from '../../../../utils/geojsonPropertyPick';
import { bajsZagrebBikeTypeI18nKey } from '../../../../utils/nextbikeBikeTypes';

type NextbikeTooltipModel = {
  bike_types?: Record<string, number>;
  bikes: number;
  maintenance: boolean;
  name: string;
  place_number?: null | number;
};

export function buildNextbikeMapTooltipSections(
  model: NextbikeTooltipModel,
  t: TFunction
): {
  description: ReactNode;
  detail: ReactNode | undefined;
  offset: [number, number];
  title: ReactNode;
} {
  const description =
    model.place_number != null || model.maintenance ? (
      <>
        {model.place_number != null ? (
          <div className="text-[11px] text-base-content/50">
            {t('cyclingMode.nextbikePopupStationNo', { number: model.place_number })}
          </div>
        ) : null}
        {model.maintenance ? (
          <div className="text-xs italic text-warning">
            {t('cyclingMode.nextbikePopupMaintenance')}
          </div>
        ) : null}
      </>
    ) : undefined;

  const detail =
    model.bike_types && Object.keys(model.bike_types).length > 0 ? (
      <div className="flex flex-col gap-1">
        {sortedBikeTypeEntries(model.bike_types).map(([typeId, count]) => {
          const typeKey = bajsZagrebBikeTypeI18nKey(typeId);
          return (
            <div className="flex flex-wrap items-baseline gap-x-1.5" key={typeId}>
              <span className={`font-bold tabular-nums ${bikeTypeNumberClass(typeId)}`}>
                {count}
              </span>
              <span className="text-base-content/70">
                {typeKey ? t(typeKey) : t('cyclingMode.nextbikeBikeTypeUnknown', { id: typeId })}
              </span>
            </div>
          );
        })}
      </div>
    ) : undefined;

  return {
    description,
    detail,
    offset: [0, -12],
    title: model.name,
  };
}

export function nextbikeTooltipModelFromClusterProps(
  p: Record<string, unknown>
): NextbikeTooltipModel {
  const bikes = firstNumberProp(p, ['bikes']) ?? 0;
  const maintenance = Boolean(p.maintenance);
  const name = firstStringProp(p, ['name']) || 'Bajs';
  const placeRaw = p.place_number;
  const place_number =
    typeof placeRaw === 'number' && Number.isFinite(placeRaw)
      ? placeRaw
      : typeof placeRaw === 'string'
        ? Number(placeRaw)
        : undefined;
  let bike_types: Record<string, number> | undefined;
  const raw = p.bike_types_json;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          const n = typeof v === 'number' ? v : Number(v);
          if (Number.isFinite(n)) out[k] = n;
        }
        if (Object.keys(out).length > 0) bike_types = out;
      }
    } catch {
      /* ignore */
    }
  }
  return {
    bike_types,
    bikes,
    maintenance,
    name,
    place_number: Number.isFinite(place_number) ? place_number : undefined,
  };
}

export function nextbikeTooltipModelFromStation(station: BajsStation): NextbikeTooltipModel {
  return {
    bike_types: station.bike_types,
    bikes: station.bikes,
    maintenance: station.maintenance,
    name: station.name,
    place_number: station.place_number,
  };
}

function bikeTypeNumberClass(typeId: string): string {
  switch (typeId) {
    case '196':
      return 'text-nextbike dark:text-nextbike-bright';
    case '409':
      return 'text-secondary';
    default:
      return 'text-warning';
  }
}

function sortedBikeTypeEntries(bike_types: Record<string, number>): [string, number][] {
  return Object.entries(bike_types).sort(([a], [b]) => Number(a) - Number(b));
}
