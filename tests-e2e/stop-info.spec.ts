import { test, expect } from './fixtures';

/**
 * Stop info and route tests.
 *
 * The app supports deep-linkable URLs:
 *   /?route=1&dir=A          → selects tram route 1 (Zap.kol. - Borongaj)
 *   /?route=1&dir=A&stop=106_1 → also selects stop "Trg bana J. Jela\u010di\u0107a"
 *
 * All selectors captured via Playwright MCP.
 */

test.describe('route selection', () => {
  test('selecting a route shows the route info bar', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    // Route info bar: route number badge (exact text "1" as a badge)
    await expect(page.locator('text="1"').first()).toBeVisible();
    // Route heading
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj' })).toBeVisible();
  });

  test('route info bar has Zatvori and Prika\u017ei detalje rute buttons', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Prika\u017ei detalje rute' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zatvori' })).toBeVisible();
  });

  test('route details modal shows all stops for route 1', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Prika\u017ei detalje rute' }).click();

    // Route modal heading (level 2)
    await expect(
      page.getByRole('heading', { name: 'Zap.kol. - Borongaj', level: 2 }),
    ).toBeVisible();

    // Known stops on tram 1 direction A
    await expect(page.getByRole('button', { name: 'Trg bana J. Jela\u010di\u0107a' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Borongaj' }).first()).toBeVisible();
  });

  test('route details modal shows both directions', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Prika\u017ei detalje rute' }).click();

    // Direction toggle buttons (captured via MCP)
    await expect(page.getByRole('button', { name: /Borongaj/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Zapadni kolodvor/ }).first()).toBeVisible();
  });

  test('closing route info bar removes it from the page', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj' })).toBeVisible();
    await page.getByRole('button', { name: 'Zatvori' }).click();
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj' })).not.toBeVisible();
  });
});

test.describe('stop info', () => {
  test('selecting a stop shows its name and direction', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await page.waitForLoadState('networkidle');

    // Stop info panel heading (captured via MCP)
    await expect(
      page.getByRole('heading', { name: 'Trg bana J. Jela\u010di\u0107a' }),
    ).toBeVisible();
    await expect(page.getByText(/Smjer prema/)).toBeVisible();
  });

  test('stop panel has Vozila u blizini and Red vo\u017enje tabs', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: 'Vozila u blizini' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Red vo\u017enje' })).toBeVisible();
  });

  test('Red vo\u017enje tab shows timetable content', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Red vo\u017enje' }).click();

    // The StopTabSelector uses CSS class "tab-active" (not aria-selected)
    // to mark the active tab — check for that class instead.
    await expect(page.getByRole('tab', { name: 'Red vo\u017enje' })).toHaveClass(/tab-active/);
  });

  test('stop panel has Zatvori and Prika\u017ei detalje buttons', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await page.waitForLoadState('networkidle');

    // StopInfoBar uses title attributes (not aria-label) on icon buttons.
    // Use [title] locator for reliability over getByRole name matching.
    await expect(page.locator('[title="Prika\u017ei detalje"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[title="Zatvori"]').first()).toBeVisible({ timeout: 10_000 });
  });
});
