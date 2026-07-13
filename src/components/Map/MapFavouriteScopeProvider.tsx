import type { ReactNode } from 'react';

import type { MapFavouriteScope } from '../../types/mapPlaceFavourite';

import { MapFavouriteScopeContext } from './mapFavouriteScopeContext';

export function MapFavouriteScopeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MapFavouriteScope;
}) {
  return (
    <MapFavouriteScopeContext.Provider value={value}>{children}</MapFavouriteScopeContext.Provider>
  );
}
