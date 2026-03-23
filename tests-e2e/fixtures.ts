/**
 * Shared Playwright fixtures for Kreni E2E tests.
 *
 * Import `test` and `expect` from this file instead of `@playwright/test`
 * directly so app-level fixtures run automatically for every spec.
 *
 * Current fixtures:
 *   - `page` override: injects a localStorage init-script that marks all
 *     onboarding variants as completed, preventing the OnboardingWizard modal
 *     (z-[9999]) from intercepting pointer events during every test.
 *
 * Adding a new fixture later is a one-liner:
 *   export const test = base.extend<{ myFixture: MyType }>({ ... });
 */

import type { Page } from '@playwright/test';

import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ page: Page }>({
  /**
   * Override `page` to pre-populate localStorage before each navigation.
   * The zustand-persist key `kreni-settings` stores `onboardingCompleted`
   * which controls whether the OnboardingWizard modal is shown.
   * `run` is Playwright's `use` parameter, renamed to avoid the
   * react-hooks/rules-of-hooks ESLint false positive.
   */
  page: async ({ page }, run) => {
    await page.addInitScript(() => {
      try {
        const raw = localStorage.getItem('kreni-settings');
        const stored = raw ? JSON.parse(raw) : {};
        if (!stored.state) stored.state = {};
        stored.state.onboardingCompleted = {
          city: true,
          cycling: true,
          driving: true,
          list: true,
          transit: true,
        };
        localStorage.setItem('kreni-settings', JSON.stringify(stored));
      } catch {
        // ignore localStorage / JSON errors in the browser context
      }
    });
    await run(page);
  },
});

export { expect };
