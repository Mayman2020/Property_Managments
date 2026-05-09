import { defineConfig } from '@playwright/test';

const BASE_URL = process.env['E2E_WEB_URL'] ?? 'http://localhost:4500';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000
  }
});
