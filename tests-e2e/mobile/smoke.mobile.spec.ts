/**
 * Mobile smoke tests — Pixel 5 (393×851, touch)
 *
 * Verifies that the app boots correctly on a mobile viewport:
 *   - correct page title
 *   - no uncaught JS errors
 *   - no unexpected console errors
 *   - core shell elements are visible and accessible via touch targets
 *   - realtime data-status badge renders within the expected timeout
 */

import { expect, test } from '../fixtures';

test.describe('mobile smoke', () => {
  test('page loads with the correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Kreni — Praćenje javnog prijevoza u Zagrebu');
  });

  test('root route renders without uncaught JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    // Allow time for initial data load, then assert no crashes.
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('page has no unexpected console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      // Known-harmless errors: unreachable proxy / realtime endpoints.
      if (
        text.includes('localhost:8787') ||
        text.includes('localhost:9999') ||
        text.includes('ERR_CONNECTION_REFUSED') ||
        text.includes('Failed to load resource') ||
        text.includes('[RealtimeStore]')
      )
        return;
      errors.push(text);
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('app shell is visible on mobile: search button and location button', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Pretraži linije/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Moja lokacija' })).toBeVisible();
  });

  test('data status button shows ZET data age or GPS error badge', async ({ page }) => {
    await page.goto('/');
    // Either the age badge (successful static load) or the error badge for
    // the realtime feed (which is expected when no proxy is running).
    const ageBadge = page.getByRole('button', { name: /ZET podaci stari/ });
    const errorBadge = page.locator('.badge-error', { hasText: 'GPS uživo' });
    await expect(ageBadge.or(errorBadge)).toBeVisible({ timeout: 15_000 });
  });
});
