/**
 * Renders map or list mode based on the persisted appMode setting.
 */
import { PublicTransportMode } from '../pages/PublicTransportMode';
import { ListApp } from './ListMode/ListApp';
import { useSettingsStore } from '../stores/settingsStore';

export function AppModeSwitch() {
  const appMode = useSettingsStore((s) => s.appMode);
  return appMode === 'list' ? <ListApp /> : <PublicTransportMode />;
}
