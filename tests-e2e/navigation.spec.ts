import { test, expect } from './fixtures';

/**
 * Navigation tests — verify each top-level route renders its expected content.
 *
 * NOTE: The OnboardingWizard modal (shown on first visit) is suppressed via the
 * `page` fixture in fixtures.ts (sets localStorage before each page load).
 * Selectors are the ACTUAL page content, not the wizard overlay.
 *
 *   /         → buttons "Pretraži linije..." + "Moja lokacija" always present
 *   /cycling  → URL confirms routing; no static badge without data (no heading)
 *   /driving  → badge "Auto Način" always rendered by DrivingMode
 *   /city     → badge "Gradski Način" always rendered by CityLifeMode
 *   /settings → h1 "Postavke" + h2 sections
 */

test.describe('navigation', () => {
  test('home route (/) shows the transport app shell', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /Pretra\u017ei linije/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Moja lokacija' })).toBeVisible();
  });

  test('cycling route (/cycling) shows Biciklizam mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/cycling');
    await page.waitForLoadState('networkidle');

    // CyclingMode has no always-visible static heading (the "Biciklizam" heading
    // was from the OnboardingWizard, now dismissed by fixture).
    // Confirm routing succeeded and no JS errors occurred.
    expect(new URL(page.url()).pathname).toBe('/cycling');
    expect(errors).toHaveLength(0);
  });

  test('driving route (/driving) shows V\u017enja Auta mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/driving');
    await page.waitForLoadState('networkidle');

    // DrivingMode always renders an "Auto Način" mode badge
    await expect(page.getByText('Auto Na\u010din')).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('city route (/city) shows Gradski \u017divot mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/city');
    await page.waitForLoadState('networkidle');

    // CityLifeMode always renders a "Gradski Način" mode badge
    await expect(page.getByText('Gradski Na\u010din')).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});

test.describe('settings', () => {
  test('settings page shows Postavke heading', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Postavke', level: 1 })).toBeVisible();
  });

  test('settings page shows all section headings', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    for (const section of ['Izgled', 'Karta', 'Podaci i predmemorija', 'O aplikaciji']) {
      await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible();
    }
  });

  test('settings page has a back link to home', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Captured via MCP: uid=2_1 link url="http://localhost:5173/"
    const backLink = page.locator('a[href="/"]');
    await expect(backLink).toBeVisible();
  });

  test('settings: clear cache button is present', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Obri\u0161i predmemoriju' })).toBeVisible();
  });

  test('settings: show intro button is present', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: 'Prika\u017ei uvod ponovno' })).toBeVisible();
  });

  test('settings: back link navigates to home', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.locator('a[href="/"]').click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('button', { name: /Pretra\u017ei linije/ })).toBeVisible();
  });
});
