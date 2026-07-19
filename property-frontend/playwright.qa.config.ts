import { defineConfig } from '@playwright/test';

const WEB = process.env['E2E_WEB_URL'] ?? 'http://localhost:4208';

export default defineConfig({
  testDir: './e2e/_qa',
  testMatch: /.*\.qa\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../docs/stabilization/evidence/_playwright-html', open: 'never' }]
  ],
  timeout: 90_000,
  expect: { timeout: 12_000 },
  use: {
    baseURL: WEB,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ignoreHTTPSErrors: true
  }
});
