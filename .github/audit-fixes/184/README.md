# Cross-tab profile validation (#184)

Before: an invalid X profile link silently blocked a privacy save, and preferences disabled saving without showing the field. After: every settings tab shows an actionable shared-draft validation summary; a save attempt selects Profile and focuses the first invalid field, including its associated error. All settings retain the shared-save behavior.

Matched before/after captures follow the same invalid-link → privacy change → save interaction, at 1280×900 and 390×900. After saving is attempted, the focused invalid field is intentionally revealed. The regression also covers the summary's keyboard action, Story preferences save eligibility, recovered draft validation, server rejection/retry, and persistence of both the corrected social link and privacy change after reload.

Run a disposable local backend with the standard reader fixture and frontend, then `E2E_BASE_URL=http://127.0.0.1:3024 node .github/audit-fixes/184/regression.mjs`. Optional `E2E_EMAIL`, `E2E_PASSWORD`, `CHROMIUM_PATH`; the browser otherwise uses system or managed Chromium. `AUDIT_BEFORE=1` against production source captures the baseline. The test restores the two edited profile fields. Synthetic account only; Chromium desktop/mobile emulation, not physical iPhone/Safari or a physical screen-reader session.
