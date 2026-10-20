# Author follow / own-profile consistency

Production baseline: `4055dbf32044d69afa0679a932e22b240117143a`.

Matching screenshots show the reader's own profile after following the same local author through the author page and navigating within the app. Before, the summary retained 1 Following while `/users/me` and the live connections list had 2; after, the summary shows 2. Desktop is 1440×1000 and mobile is Chromium at 390×844. These are synthetic disposable local accounts, not customer data. Native iPhone/Safari was not tested.

The real-backend browser regression covers follow and unfollow at both widths, the live connections count, rollback on failure, and responses delayed across navigation. Shared account updates change only following membership/count and are guarded by the signed-in session and per-author successful mutation ordering; they do not replace unrelated account fields with a fetched snapshot.

Reproduce with the disposable backend and `E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test e2e/author-follow-sync.spec.ts`. Browser launch uses the configured Playwright browser, an optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, or system Chromium when present.
