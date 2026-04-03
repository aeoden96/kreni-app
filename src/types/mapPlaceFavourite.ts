import type { MergedPointClusterLayerId } from '../components/Map/cityPointClusterConstants';

/** Merged cluster layers plus polygon / non-merged point layers. */
export type MapFavouriteLayerId = 'publicArchitectureCompetitions' | MergedPointClusterLayerId;

export type MapFavouriteScope = 'city' | 'cycling' | 'driving';

export interface MapPlaceFavourite {
  id: string;
  lat: number;
  layerId: MapFavouriteLayerId;
  lng: number;
  scope: MapFavouriteScope;
  sourceId?: string;
  title: string;
}
