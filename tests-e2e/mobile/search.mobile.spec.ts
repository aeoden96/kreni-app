/**
 * Mobile search modal tests — Pixel 5 (393×851, touch)
 *
 * Verifies that the search modal opens correctly on mobile, filter buttons
 * are tappable, the route list renders, text input filters results, and
 * selecting a route sets the URL parameter.
 *
 * Note: on mobile the filter buttons include route counts in their accessible
 * names (e.g. "Tram (19)", "Bus (136)"), so partial regex matching is used.
 */

import { test, expect } from '../fixtures';

test.describe('mobile search modal', () => {
  test('tapping "Pretraži linije..." opens the search modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    await expect(page.getByRole('heading', { name: 'Pretraži', level: 2 })).toBeVisible();
  });

  test('search modal shows tram and bus filter buttons', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    // Button names include counts on mobile: "Tram (19)", "Bus (136)".
    await expect(page.getByRole('button', { name: /Tram/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Bus/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stanice' })).toBeVisible();
  });

  test('search modal shows the route list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    await expect(page.getByRole('button', { name: /1 Zap\.kol\./ })).toBeVisible();
  });

  test('typing in the search box filters the route list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    await page.getByRole('textbox').fill('17');
    await expect(page.getByRole('button', { name: /17 Prečko/ })).toBeVisible();
  });

  test('tapping a route closes the modal and sets the route URL param', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Pretraži linije/ }).click();
    await page.getByRole('button', { name: /1 Zap\.kol\./ }).click();
    await expect(page.getByRole('heading', { name: /Zap\.kol\./, level: 3 })).toBeVisible();
    await expect(page).toHaveURL(/[?&]route=1/);
  });
});
