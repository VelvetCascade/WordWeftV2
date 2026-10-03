import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** Reuse the local-only integration guard while launching WebKit, not Chromium. */
export default defineConfig({
    ...base,
    use: { ...base.use, browserName: 'webkit', launchOptions: {} },
});
