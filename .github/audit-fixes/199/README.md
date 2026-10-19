# Cancelled image sharing (#199)

AbortError from native quote/portfolio file sharing now exits without triggering the download fallback. An export remains one operation while pending. The action reads “Share or download” to describe its platform-dependent result; a genuine sharing failure downloads the image and announces that fallback, while cancellation stays quiet.

Run with the canonical disposable local backend fixtures:

```sh
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/199/after node scripts/audit/file-share-cancellation.mjs
```

The real quote/author entry points are checked at 390/1440px. Native cancellation produces no download or failure notice, pending activation produces one request, unsupported file sharing downloads one PNG, a genuine failure downloads one PNG with fallback status, and native success does not download. Downloaded bytes are compared with the finished canvas preview. Images use synthetic solid-color SVG responses so the test is independent of external artwork availability. Native API outcomes are simulated; no social delivery or physical iPhone/Safari test occurred.

Before, production downloaded `wordweft-the-last-spring-in-bellweather-quote.png` after AbortError and failed the cancellation assertion. Matching screenshots show the cancelled export surface; the download event proof is in `before/observations.json` and corrected outcomes in `after/observations.json`.

Browser selection uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, compatibility `CHROMIUM_PATH`, system Chromium when present, then a Playwright-managed browser (`npx playwright install chromium`). Full validation results are in the PR.
