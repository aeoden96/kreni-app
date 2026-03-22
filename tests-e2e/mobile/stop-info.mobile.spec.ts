/**
 * Mobile route & stop info tests — Pixel 5 (393×851, touch)
 *
 * Verifies the route info bar and stop info panel on a mobile viewport using
 * deep-link navigation to ensure deterministic state without map interaction.
 */

import { test, expect } from '../fixtures';

test.describe('mobile route selection', () => {
  test('selecting a route shows the route info bar', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await expect(page.locator('text="1"').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj', level: 3 })).toBeVisible();
  });

  test('route info bar has Zatvori and Prikaži detalje rute buttons', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await expect(page.getByRole('button', { name: 'Zatvori' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Prikaži detalje rute' })).toBeVisible();
  });

  test('route details modal shows all stops for route 1', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.getByRole('button', { name: 'Prikaži detalje rute' }).click();
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj', level: 2 })).toBeVisible();
    await expect(page.getByText('Trg bana J. Jelačića')).toBeVisible();
    await expect(page.getByText('Borongaj').first()).toBeVisible();
  });

  test('route details modal shows both directions', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.getByRole('button', { name: 'Prikaži detalje rute' }).click();
    // Use exact: true to avoid strict mode violation — the modal and route info
    // bar both contain direction-related text when the modal is open alongside.
    await expect(page.getByRole('button', { name: 'Borongaj', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Zapadni kolodvor/ }).first()).toBeVisible();
  });

  test('closing the route info bar removes it from the page', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj', level: 3 })).toBeVisible();
    // No stop selected here so there is only one Zatvori button (the route info bar close).
    await page.getByRole('button', { name: 'Zatvori' }).click();
    await expect(page.getByRole('heading', { name: 'Zap.kol. - Borongaj', level: 3 })).not.toBeVisible();
  });
});

test.describe('mobile stop info', () => {
  test('selecting a stop shows its name and direction', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await expect(
      page.getByRole('heading', { name: 'Trg bana J. Jelačića', level: 3 }),
    ).toBeVisible();
    await expect(page.getByText(/Smjer prema/)).toBeVisible();
  });

  test('stop panel has Vozila u blizini and Red vo\u017enje tabs', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await expect(page.getByRole('tab', { name: 'Vozila u blizini' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Red vožnje' })).toBeVisible();
  });

  test('tapping Red vožnje tab activates it', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await page.getByRole('tab', { name: 'Red vožnje' }).click();
    // DaisyUI uses .tab-active rather than aria-selected.
    await expect(page.getByRole('tab', { name: 'Red vožnje' })).toHaveClass(/tab-active/);
  });

  test('stop panel has Prikaži detalje and Zatvori icon buttons', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await expect(page.locator('[title="Prikaži detalje"]')).toBeVisible();
    await expect(page.locator('[title="Zatvori"]').last()).toBeVisible();
  });

  test('tapping Zatvori closes the stop info panel', async ({ page }) => {
    await page.goto('/?route=1&dir=A&stop=106_1');
    await expect(
      page.getByRole('heading', { name: 'Trg bana J. Jelačića', level: 3 }),
    ).toBeVisible();
    await page.locator('[title="Zatvori"]').last().click();
    await expect(
      page.getByRole('heading', { name: 'Trg bana J. Jelačića', level: 3 }),
    ).not.toBeVisible();
  });
});
