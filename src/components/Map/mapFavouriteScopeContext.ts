import { createContext } from 'react';

import type { MapFavouriteScope } from '../../types/mapPlaceFavourite';

export const MapFavouriteScopeContext = createContext<MapFavouriteScope | null>(null);
