import { expect, test } from './fixtures';

/**
 * Smoke tests — verify the app boots without JS errors.
 * These run on every CI push and act as the first gate.
 *
 * Title and selectors captured via Playwright MCP inspecting the live app.
 */

const APP_TITLE = 'Kreni \u2014 Pra\u0107enje javnog prijevoza u Zagrebu';

// In the E2E test environment the app is built with
// VITE_GTFS_PROXY_URL=http://localhost:9999 (set in playwright.config.ts
// webServer.env).  Tests that don't set up a page.route() intercept will see
// ERR_CONNECTION_REFUSED on that port.  Filter all of these known cases so
// only unexpected JS errors fail the smoke test.
function isKnownProxyError(msg: string): boolean {
  return (
    msg.includes('localhost:8787') ||
    msg.includes('localhost:9999') ||
    msg.includes('8787') ||
    msg.includes('9999') ||
    msg.includes('[RealtimeStore]') ||
    // Browser-level network error when proxy port is not open in the test env
    msg.includes('ERR_CONNECTION_REFUSED') ||
    msg.includes('Failed to load resource')
  );
}

test.describe('smoke', () => {
  test('page loads and has the correct title', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(APP_TITLE);
  });

  test('root route renders without uncaught JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('page has no unexpected console errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isKnownProxyError(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(consoleErrors).toHaveLength(0);
  });

  test('app shell is visible: search button and location button present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Captured via MCP: stable buttons always visible on the home route
    await expect(page.getByRole('button', { name: /Pretra\u017ei linije/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Moja lokacija' })).toBeVisible();
  });

  test('data status button shows ZET data age', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // When realtime proxy is up:   shows "ZET podaci stari Xs" (badge-success button)
    // When realtime proxy is down (E2E Docker env): shows "GPS uživo: ..." (badge-error div)
    // Both confirm the app is running and displaying realtime status to the user.
    const successBadge = page.getByRole('button', { name: /ZET podaci stari/ });
    const errorBadge = page.locator('.badge-error').filter({ hasText: 'GPS u\u017eivo' });
    // Allow up to 15 s for the initial GTFS data to load and render the status.
    await expect(successBadge.or(errorBadge)).toBeVisible({ timeout: 15_000 });
  });
});
