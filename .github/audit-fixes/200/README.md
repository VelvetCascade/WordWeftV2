# Portfolio card readiness (#200)

Before, the export button was enabled during held image requests and downloaded a transparent 1080×1350 PNG. Now the button and guarded handler wait for the current card revision. Rendering occurs on a private canvas and publishes atomically; tab changes or closing discard obsolete work. Empty, failed and stalled image loads resolve to the existing branded fallback (8 seconds per image).

```sh
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/200/after node scripts/audit/portfolio-readiness.mjs
```

Use the disposable canonical public author fixture `local-writer`. At 390/1440px the real author entry point checks held assets, blocked activation, tab changes during preparation, finished preview/download byte equality, failed assets after reopening, and bounded loading fallback. The `before` observation records production's transparent file; the same pending-state assertion fails before the fix. `after` contains matching pending screenshots and finished previews. Native sharing is disabled locally, and no external delivery occurs.

Browser selection: `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, compatibility `CHROMIUM_PATH`, installed system Chromium, then Playwright-managed Chromium (`npx playwright install chromium`). No physical iPhone/Safari claim.
