/**
 * Leaflet marker zIndexOffset values. Stops stay below vehicles at the same location.
 */
export const MARKER_Z_VEHICLE = 800;
export const MARKER_Z_STOP_DEFAULT = -400;
export const MARKER_Z_STOP_HIGHLIGHTED = -300;
export const MARKER_Z_STOP_SELECTED = -200;
/** Parent name labels sit slightly under platform stop pins when stacked */
export const MARKER_Z_STOP_PARENT_LABEL = MARKER_Z_STOP_DEFAULT - 50;
