import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { isNative } from './platform';

/**
 * Tactile feedback. No-op on web/PWA (deliberately — desktop/PWA should not
 * buzz); native routes through `@capacitor/haptics`. Fire-and-forget: failures
 * (e.g. no vibrator) are swallowed so callers never need to await or catch.
 */

type Impact = 'heavy' | 'light' | 'medium';

const IMPACT_STYLE: Record<Impact, ImpactStyle> = {
  heavy: ImpactStyle.Heavy,
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
};

/** A physical bump — for discrete actions (button press, menu open). */
export function hapticImpact(style: Impact = 'light'): void {
  if (!isNative()) return;
  void Haptics.impact({ style: IMPACT_STYLE[style] }).catch(() => {});
}

/** A lighter "selection changed" tick — for picking an item / switching modes. */
export function hapticSelection(): void {
  if (!isNative()) return;
  void Haptics.selectionStart()
    .then(() => Haptics.selectionChanged())
    .then(() => Haptics.selectionEnd())
    .catch(() => {});
}
