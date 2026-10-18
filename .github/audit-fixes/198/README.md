# Native-share feedback (#198)

A non-cancellation native URL-share failure now announces an actionable copy/select-link message in the existing dialog live alert. AbortError stays quiet. The native button is disabled while pending, and an attempt generation invalidates late results on close or URL change.

Run against the frontend and canonical disposable local backend fixtures:

```sh
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/198/after node scripts/audit/native-share-feedback.mjs
```

The proof covers book, author and chapter sharing at 390/1440px: NotAllowedError, successful retry, copy recovery, manual selection, quiet cancellation, single pending request, late failure after close/reopen, unsupported Web Share, and clipboard denial. Before, the original source failed `native failures must announce recovery` with zero alerts; matching screenshots show the same book dialog before and after that failure. `after/observations.json` records checked outcomes.

The script uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, compatibility `CHROMIUM_PATH`, system Chromium if present, then a Playwright-managed browser. Install the latter with `npx playwright install chromium` if needed. Native outcomes and clipboard permissions are simulated with browser API contracts; no actual share sheet, social delivery, or physical iPhone/Safari test occurred. All data is synthetic. Full validation is recorded in the PR.
