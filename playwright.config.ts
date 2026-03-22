import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests run entirely inside Docker (via `yarn test:e2e`).
 *
 * SETUP:
 *   yarn test:e2e        # runs `docker compose run --rm playwright-runner`
 *
 * HOW IT WORKS:
 *   - Everything runs in the same Docker container (playwright-runner service).
 *   - `webServer` starts Vite on localhost:5174 inside the container.
 *   - Tests connect to localhost:5174 — no host↔container networking needed.
 *   - For headed debugging or MCP: `yarn pw:server` then set
 *     PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3000/
 */

const BASE_URL = 'http://localhost:5174';

export default defineConfig({
  testDir: './tests-e2e',
  testMatch: '**/*.spec.ts',

  /* Start Vite on port 5174 inside the container (or reuse if already running). */
  webServer: {
    command: 'node ./node_modules/.bin/vite --port 5174',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: {
      // Point realtime fetches at a local mock server so page.route() can
      // intercept them.  Without this the proxy URL is empty and the store
      // throws before issuing any HTTP request, which page.route() never sees.
      VITE_GTFS_PROXY_URL: 'http://localhost:9999',
      // Expose the Leaflet map instance on window.__leafletMap for E2E tests.
      VITE_E2E: 'true',
    },
  },

  /* Fail the build on CI if you accidentally left test.only in source code. */
  forbidOnly: !!process.env['CI'],

  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,

  /* Limit parallel workers on CI */
  workers: process.env['CI'] ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  use: {
    baseURL: BASE_URL,

    /* Collect trace on first retry for post-mortem debugging */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      // Exclude *.mobile.spec.ts files — those run only in the mobile-chrome project.
      // The regex matches any .spec.ts file whose name does NOT end with .mobile.spec.ts
      testMatch: /^(?!.*\.mobile\.spec\.ts$).*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      // Only run *.mobile.spec.ts files for the Pixel 5 project.
      testMatch: '**/*.mobile.spec.ts',
      // Run headed mobile tests with a single worker to make them easy to
      // observe in a single browser window.
      workers: 1,
      use: {
        ...devices['Pixel 5'],
        // Slow down actions for easier visual debugging when running headed.
        // Adjust milliseconds to taste (e.g. 100-500).
        launchOptions: {
          slowMo: 600,
        },
      },
    },

    // Uncomment to enable additional browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
