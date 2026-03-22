import { test, expect } from './fixtures';

/**
 * Search modal tests.
 *
 * Selectors captured via Playwright MCP — opened the search modal,
 * observed the structure, and clicked into routes.
 */

test.describe('search modal', () => {
  test('clicking "Pretraži linije..." opens the search modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Pretraži linije/ }).click();

    // Modal heading (captured via MCP)
    await expect(page.getByRole('heading', { name: 'Pretraži', level: 2 })).toBeVisible();
  });

  test('search modal shows tram and bus filter buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Pretraži linije/ }).click();

    await expect(page.getByRole('button', { name: /Tramvaji/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Autobusi/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stanice' })).toBeVisible();
  });

  test('search modal shows the route list', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Pretraži linije/ }).click();

    // Tram 1 is always the first entry in the list (captured via MCP)
    await expect(page.getByRole('button', { name: /1 Zap\.kol\./ })).toBeVisible();
  });

  test('typing in search filters the list', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    const searchBox = page.getByRole('textbox');
    await searchBox.fill('17');

    // Route 17 should appear; route 1 without "17" may not
    await expect(page.getByRole('button', { name: /17 Prečko/ })).toBeVisible();
  });

  test('selecting a route from search shows route info bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    await page.getByRole('button', { name: /1 Zap\.kol\./ }).click();

    // Route info bar appears (captured via MCP: heading level 3 in the bar)
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj' })).toBeVisible();
    // URL updates to reflect the selected route
    await expect(page).toHaveURL(/route=1/);
  });
});
