import { TRAIN_MODE } from '../config/modes';
import { GTFSMode } from './GTFSMode';

export function TrainMode() {
  return <GTFSMode config={TRAIN_MODE} />;
}
