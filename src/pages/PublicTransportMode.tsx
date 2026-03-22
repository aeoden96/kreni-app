import { GTFSMode } from './GTFSMode';
import { TRANSIT_MODE } from '../config/modes';

export function PublicTransportMode() {
  return <GTFSMode config={TRANSIT_MODE} />;
}

