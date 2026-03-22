import { test, expect } from './fixtures';
import { interceptRealtimeFeed } from './realtime-mock';

/**
 * Map interaction tests — the core E2E coverage gap.
 *
 * These tests use `data-testid` attributes added to Leaflet DivIcon HTML strings
 * and React components so that selectors are stable and independent of Leaflet's
 * internal class names.
 *
 * Attributions:
 *   data-testid="map-container"       → BaseMap MapContainer (Leaflet also adds .leaflet-container)
 *   data-testid="stop-marker"         → makeStopIcon divs and parent-station-marker divs
 *   data-testid="vehicle-marker"      → makeVehicleIcon wrappers in vehicleIcon.ts
 *   data-testid="user-location-marker"→ user location DivIcon in BaseMap.tsx
 *   .route-polyline                   → className injected into <Polyline> pathOptions
 *
 * Stop IDs and trip IDs are sourced from the static GTFS feed:
 *   Route 1, direction A (Zap.kol. → Borongaj)
 *   Trip:  0_20_101_1_10007   (trips.txt, route_id=1, direction_id=0)
 */

test.describe('Map interactions', () => {
  // ── 1. Map container ─────────────────────────────────────────────────────

  test('map container renders after app load', async ({ page }) => {
    await page.goto('/');
    // Leaflet adds .leaflet-container to the MapContainer div
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  // ── 2. Stop markers ───────────────────────────────────────────────────────

  test('stop markers appear on the map after route selection', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    // Platform stop markers fade in between zoom 14–17 and are fully visible at zoom ≥ 17.
    // Use the map instance exposed on window.__leafletMap (only present in E2E / DEV modes)
    // to programmatically zoom in without relying on scroll wheel simulation.
    await page.evaluate(() => {
      const map = (window as unknown as { __leafletMap?: { setZoom(z: number): void } }).__leafletMap;
      if (map) map.setZoom(17);
    });
    await page.waitForTimeout(500); // allow Leaflet zoom animation to complete

    const markers = page.locator('[data-testid="stop-marker"]');
    await expect(markers.first()).toBeVisible({ timeout: 10000 });
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  // ── 3. Clicking a stop marker ─────────────────────────────────────────────

  test('clicking a stop marker opens the stop info panel and updates URL', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    // Zoom to 17 so platform stop markers become fully visible
    await page.evaluate(() => {
      const map = (window as unknown as { __leafletMap?: { setZoom(z: number): void } }).__leafletMap;
      if (map) map.setZoom(17);
    });
    await page.waitForTimeout(500); // allow Leaflet zoom animation to complete

    // Wait for a platform stop marker to appear, then click it.
    // The Spiderfier may expand overlapping markers into a fan of spider labels;
    // clicking a spider label is equivalent to selecting that stop.
    const firstMarker = page.locator('[data-testid="stop-marker"]').first();
    await expect(firstMarker).toBeVisible({ timeout: 10000 });
    await firstMarker.click();

    // If the Spiderfier expanded a cluster, click the first spider label
    const spiderLabel = page.locator('.spider-label-content').first();
    const spiderVisible = await spiderLabel.isVisible({ timeout: 1500 }).catch(() => false);
    if (spiderVisible) {
      await spiderLabel.click();
    }

    // Either path should open the stop info panel and update the URL
    await expect(page.locator('[data-testid="stop-info-panel"]')).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/[?&]stop=/);
  });

  // ── 4. Route polyline ─────────────────────────────────────────────────────

  test('route polyline is visible on the map after route selection', async ({ page }) => {
    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    // RouteShape renders <Polyline pathOptions={{ className: 'route-polyline' }}>
    // Leaflet maps this className onto the SVG <path> element
    await expect(page.locator('.route-polyline').first()).toBeVisible();
  });

  // ── 5. Vehicle markers ────────────────────────────────────────────────────

  test('vehicle markers appear on the map when realtime feed contains matching vehicles', async ({ page }) => {
    // Register the protobuf intercept BEFORE goto so the first poll is caught
    await interceptRealtimeFeed(page, [
      {
        vehicleId: 'v1',
        // Real trip from trips.txt — route 1, direction A (Borongaj)
        tripId: '0_20_101_1_10007',
        routeId: '1',
        // Position within Zagreb city centre — visible at default zoom 13
        lat: 45.815,
        lng: 15.982,
        bearing: 90,
      },
    ]);

    await page.goto('/?route=1&dir=A');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="vehicle-marker"]').first()).toBeVisible();
  });

  // ── 6. User location marker ───────────────────────────────────────────────

  test('user location marker appears on the map after granting geolocation', async ({ page }) => {
    // Mock the browser geolocation API before the page loads
    await page.context().setGeolocation({ latitude: 45.815, longitude: 15.982 });
    await page.context().grantPermissions(['geolocation']);

    await page.goto('/');

    // The "Moja lokacija" button in SpiderMenu triggers navigator.geolocation.getCurrentPosition
    await page.getByTitle('Moja lokacija').click();

    await expect(page.locator('[data-testid="user-location-marker"]')).toBeVisible();
  });
});
