/**
 * Mobile navigation tests — Pixel 5 (393×851, touch)
 *
 * Checks that all four app modes and the settings page load correctly on a
 * mobile viewport without JS errors, and that navigation between them works.
 */

import { test, expect } from '../fixtures';

test.describe('mobile navigation', () => {
  test('home route (/) shows the transport app shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Pretraži linije/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Moja lokacija' })).toBeVisible();
  });

  test('cycling route (/cycling) loads without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/cycling');
    await expect(page).toHaveURL('/cycling');
    expect(errors).toHaveLength(0);
  });

  test('driving route (/driving) shows Vožnja Auta mode', async ({ page }) => {
    await page.goto('/driving');
    await expect(page.getByText('Auto Način')).toBeVisible();
  });

  test('city route (/city) shows Gradski Život mode', async ({ page }) => {
    await page.goto('/city');
    await expect(page.getByText('Gradski Način')).toBeVisible();
  });
});

test.describe('mobile settings', () => {
  test('settings page shows Postavke heading', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Postavke', level: 1 })).toBeVisible();
  });

  test('settings page shows all section headings', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Izgled', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Karta', level: 2 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Podaci i predmemorija', level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'O aplikaciji', level: 2 })).toBeVisible();
  });

  test('settings page has a back link to home', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('a[href="/"]')).toBeVisible();
  });

  test('settings: clear cache button is present', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Obriši predmemoriju' })).toBeVisible();
  });

  test('settings: show intro button is present', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Prikaži uvod ponovno' })).toBeVisible();
  });

  test('settings: tapping the back link navigates to home', async ({ page }) => {
    await page.goto('/settings');
    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Pretraži linije/ })).toBeVisible();
  });
});
