import { useContext } from 'react';

import type { MapFavouriteScope } from '../../types/mapPlaceFavourite';

import { MapFavouriteScopeContext } from './mapFavouriteScopeContext';

export function useMapFavouriteScope(): MapFavouriteScope {
  const v = useContext(MapFavouriteScopeContext);
  if (!v) {
    throw new Error('useMapFavouriteScope must be used within MapFavouriteScopeProvider');
  }
  return v;
}
