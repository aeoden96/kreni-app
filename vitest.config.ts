import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          environment: 'jsdom',
          exclude: ['**/node_modules/**'],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          name: 'unit',
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // Opt-in only (`yarn verify:live`). These hit the real ZET feeds, so they
        // are deliberately outside `yarn test` — a network blip or a depot at
        // 03:00 is not a code regression and must never fail CI.
        //
        // Not `extends: true`: the root config's jsdom setup file reaches for
        // `window`, which does not exist in a node environment. Nothing here
        // renders, so there is nothing to inherit.
        test: {
          // The report *is* the deliverable here, so let it reach the terminal
          // instead of being buffered away by the default reporter.
          disableConsoleIntercept: true,
          environment: 'node',
          include: ['scripts/live/**/*.live.ts'],
          name: 'live',
          reporters: ['basic'],
          setupFiles: ['./scripts/live/setup.ts'],
          testTimeout: 120_000,
        },
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: 'chromium' }],
            provider: playwright({}),
          },
          name: 'storybook',
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
    ],
    setupFiles: './src/test/setup.ts',
  },
});
