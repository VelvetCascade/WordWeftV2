import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('The mutating E2E suite must use the disposable local WordWeft runtime.');
export default defineConfig({
  testDir: './e2e', timeout: 45_000, expect: { timeout: 10_000 }, fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {}), args: ['--no-sandbox'] } },
});
