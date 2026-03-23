/**
 * Renders map or list mode based on the persisted appMode setting.
 */
import { PublicTransportMode } from '../pages/PublicTransportMode';
import { useSettingsStore } from '../stores/settingsStore';
import { ListApp } from './ListMode/ListApp';

export function AppModeSwitch() {
  const appMode = useSettingsStore((s) => s.appMode);
  return appMode === 'list' ? <ListApp /> : <PublicTransportMode />;
}
