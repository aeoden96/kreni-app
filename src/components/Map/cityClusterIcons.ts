import L from 'leaflet';
import { Wifi, Zap } from 'lucide-react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

import {
  CITY_CLUSTER_INTERNAL_LAYER_KEY,
  type CityPointClusterLayerId,
  isMergedPointClusterLayerId,
  type MergedPointClusterLayerId,
} from './cityPointClusterConstants';
import { polygonCentroidBadgeHtml } from './polygonCentroidDivIcon';

const leafIconCache = new Map<MergedPointClusterLayerId, L.DivIcon>();

export function getCityClusterLeafIcon(layerId: MergedPointClusterLayerId): L.DivIcon {
  let icon = leafIconCache.get(layerId);
  if (!icon) {
    const { anchor, size } = leafAnchorSize(layerId);
    icon = L.divIcon({
      className: `city-cluster-leaf city-cluster-leaf--${layerId}`,
      html: leafHtml(layerId),
      iconAnchor: anchor,
      iconSize: size,
    });
    leafIconCache.set(layerId, icon);
  }
  return icon;
}

function leafAnchorSize(layerId: MergedPointClusterLayerId): {
  anchor: [number, number];
  size: [number, number];
} {
  if (layerId === 'restaurants') return { anchor: [16, 16], size: [32, 32] };
  if (layerId === 'fountains' || layerId === 'wifi') return { anchor: [12, 12], size: [24, 24] };
  if (layerId === 'publicGarages' || layerId === 'electricCharging')
    return { anchor: [16, 16], size: [32, 32] };
  if (layerId === 'bikeParkings' || layerId === 'nextbikeStations')
    return { anchor: [12, 12], size: [24, 24] };
  return { anchor: [14, 14], size: [28, 28] };
}

function leafHtml(layerId: MergedPointClusterLayerId): string {
  switch (layerId) {
    case 'bikeParkings':
      return `<div class="flex items-center justify-center w-6 h-6 rounded-md shadow-md text-white font-bold text-[11px] bg-emerald-500 border-[1.5px] border-white">P</div>`;
    case 'cultural':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500 border-2 border-white shadow-lg text-[13px]">🏛️</div>`;
    case 'dogParks':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 border-2 border-white shadow-lg text-[15px]">🐕</div>`;
    case 'electricCharging':
      return `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 border-2 border-white shadow-lg">${renderToString(createElement(Zap, { className: 'w-4 h-4 text-white' }))}</div>`;
    case 'evacuation':
      return polygonCentroidBadgeHtml({ bgClass: 'bg-orange-500', emoji: '🚨' });
    case 'fountains':
      return `<div class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg text-white text-[12px]">💧</div>`;
    case 'fountainsExtra':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500 border-2 border-white shadow-lg text-[13px]">🪣</div>`;
    case 'galleries':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-fuchsia-600 border-2 border-white shadow-lg text-[15px]">🖼️</div>`;
    case 'gardens':
      return polygonCentroidBadgeHtml({ bgClass: 'bg-green-500', emoji: '🌿' });
    case 'gasStations':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500 border-2 border-white shadow-lg text-[13px]">⛽</div>`;
    case 'graffiti':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-lg text-[15px]">🎨</div>`;
    case 'healthHomes':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500 border-2 border-white shadow-lg text-[13px]">🏥</div>`;
    case 'healthInst':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow-lg text-[13px]">🏨</div>`;
    case 'markets':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow-lg text-[15px]">🛒</div>`;
    case 'nextbikeStations':
      return `<div class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 border-2 border-white shadow-md text-white font-bold text-[10px]">?</div>`;
    case 'pharmacies':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-green-500 border-2 border-white shadow-lg text-[13px]">💊</div>`;
    case 'playgrounds':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-sky-500 border-2 border-white shadow-lg text-[15px]">⛹️</div>`;
    case 'publicGarages':
      return `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg text-white font-bold text-lg">P</div>`;
    case 'recycling':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-lg text-[13px]">♻️</div>`;
    case 'restaurants':
      return `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg text-white">🍴</div>`;
    case 'sportsFacilities':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-lime-600 border-2 border-white shadow-lg text-[15px]">🏟️</div>`;
    case 'surveillanceCameras':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-slate-600 border-2 border-white shadow-lg text-[13px]">📹</div>`;
    case 'taxiStands':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400 border-2 border-white shadow-lg text-[15px]">🚕</div>`;
    case 'toilets':
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 border-2 border-white shadow-lg text-[15px]">🚻</div>`;
    case 'wifi':
      return `<div class="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 border-2 border-white shadow-lg">${renderToString(createElement(Wifi, { className: 'w-4 h-4 text-white' }))}</div>`;
    default:
      return `<div class="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-600 border-2 border-white shadow-lg text-[12px]">📍</div>`;
  }
}

const CITY_CLUSTER_LAYER_EMOJI: Record<CityPointClusterLayerId, string> = {
  cultural: '🏛️',
  dogParks: '🐕',
  evacuation: '🚨',
  fountains: '💧',
  fountainsExtra: '🪣',
  galleries: '🖼️',
  gardens: '🌿',
  graffiti: '🎨',
  healthHomes: '🏥',
  healthInst: '🏨',
  markets: '🛒',
  pharmacies: '💊',
  playgrounds: '⛹️',
  recycling: '♻️',
  restaurants: '🍴',
  sportsFacilities: '🏟️',
  toilets: '🚻',
  wifi: '📶',
};

export const MERGED_CLUSTER_LAYER_EMOJI: Record<MergedPointClusterLayerId, string> = {
  ...CITY_CLUSTER_LAYER_EMOJI,
  bikeParkings: '🅿️',
  electricCharging: '⚡',
  gasStations: '⛽',
  nextbikeStations: '🚲',
  publicGarages: '🅿️',
  surveillanceCameras: '📹',
  taxiStands: '🚕',
};

export function createCityClusterBubbleIcon(
  pointCount: number,
  layerIds: MergedPointClusterLayerId[]
): L.DivIcon {
  const abbrev =
    pointCount >= 10000
      ? `${Math.round(pointCount / 1000)}k`
      : pointCount >= 1000
        ? `${Math.round(pointCount / 100) / 10}k`
        : String(pointCount);

  const preview = layerIds.slice(0, 3).map((id) => MERGED_CLUSTER_LAYER_EMOJI[id] ?? '•');
  const emojis =
    preview.length > 0
      ? `<span class="flex shrink-0 items-center gap-0.5 text-[11px] leading-none">${preview.join('')}</span>`
      : '';

  const h = 36;
  const padX = 12;
  const countPx = Math.ceil(abbrev.length * 7.5);
  const emojiPx = preview.length > 0 ? 4 + preview.length * 13 : 0;
  const w = Math.ceil(Math.max(40, padX + countPx + emojiPx));

  return L.divIcon({
    className: 'city-cluster-bubble',
    html: `
      <div class="flex flex-row items-center justify-center h-6 box-border whitespace-nowrap rounded-xl bg-neutral-800/92 border-2 border-white shadow-lg text-white gap-1 px-1.5" style="width:${w}px">
        <span class="text-[12px] font-extrabold leading-none tabular-nums">${abbrev}</span>
        ${emojis}
      </div>
    `,
    iconAnchor: [w / 2, h],
    iconSize: [w, h],
  });
}

export function readClusterLayerId(
  props: Record<string, unknown>
): MergedPointClusterLayerId | null {
  const v = props[CITY_CLUSTER_INTERNAL_LAYER_KEY];
  if (typeof v === 'string' && isMergedPointClusterLayerId(v)) {
    return v;
  }
  return null;
}
