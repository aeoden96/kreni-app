import { TRANSIT_MODE } from '../config/modes';
import { GTFSMode } from './GTFSMode';

export function PublicTransportMode() {
  return <GTFSMode config={TRANSIT_MODE} />;
}
