# Private-note hydration regression (#211)

Synthetic note shown in the full reader on desktop (1440px) and mobile Chromium (390px). The local book, chapter, and synthetic private note are served by the disposable Spring/Mongo backend; the saved-passages request is gated before continuing to the real server. The fixture note was restored afterward. Loading screenshots show Save disabled and zero PUT requests; loaded screenshots show the existing note retained after an intentional loaded save; a fresh backend GET confirms persistence. No production data was accessed or changed. Physical iPhone behavior is unverified.

`node --test tests/passageHydration.test.mjs` exercises the actual component and API client with delayed and failed network responses. The test failed before the fix because Save was enabled while loading. After the fix it checks retained typing, editing, deliberate clearing, retry, tab reopening, and account changes at both widths.

The backend still uses unconditional PUT; atomic conflict handling for simultaneous saves on separate devices is outside this loading fix.

Portable full-reader persistence check (requires a disposable seeded Spring/Mongo runtime and frontend):

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node scripts/verify-audit-211.mjs
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium` for a system browser, or install Playwright Chromium. `E2E_READER_EMAIL`, `E2E_READER_PASSWORD`, `E2E_READER_BOOK`, and `E2E_READER_CHAPTER` can select equivalent local fixtures. Optional `AUDIT_EVIDENCE_DIR` saves loading screenshots. The script logs in without storing tokens, seeds a synthetic private note, delays the real reader GET, verifies disabled Save and zero PUTs, releases GET, saves, checks the server note, then restores its prior fixture value. It covers 1440px and 390px Chromium viewports; it does not establish native Safari behavior or cross-device conflict protection.
