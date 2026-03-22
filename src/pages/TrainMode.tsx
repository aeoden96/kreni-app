import { GTFSMode } from './GTFSMode';
import { TRAIN_MODE } from '../config/modes';

export function TrainMode() {
  return <GTFSMode config={TRAIN_MODE} />;
}
