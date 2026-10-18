# #197 — full viewport dialog backdrops

Before: the viewport height limit was applied to the fixed backdrop. At 390×844 its bottom stopped at 812px, exposing mobile navigation; the same defect affected scheduling.

After: author, book, chapter, quote and scheduling dialog ownership belongs to the inner panel. The backdrop reaches the viewport bottom while panels keep the responsive height limit and internal scrolling. Scheduling remains protected from dismissal while a request is pending.

Reproduce using synthetic canonical local fixtures and a running Vite frontend/backend:

```sh
E2E_BASE_URL=http://127.0.0.1:3022 node scripts/audit/dialog-backdrop.mjs
E2E_BASE_URL=http://127.0.0.1:3022 node scripts/audit/schedule-backdrop.mjs
```

The first script exercises real author/book/chapter/selected-quote entry points at 390×844, 740×360 and 1440×900, full backdrop bounds, panel limits, content scrolling, blocked background navigation, Tab wrapping, trigger focus restoration, Escape and close. The second imports the real scheduling component in a small Vite browser harness, checks the same backdrop bounds and a simulated visualViewport height change, and verifies pending Escape/backdrop dismissal is blocked. It never submits a real schedule. Native keyboard/Safari were not tested.

Production failed the share backdrop check (812 != 844). The scheduling follow-up independently failed the same check before its panel ref change. Matching before screenshots are linked in the PR and issue comment; images here show the corrected state. Full validation results are recorded in the PR.

Browser launch uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE` (or the compatibility override `CHROMIUM_PATH`) when provided, system Chromium when installed, otherwise Playwright’s managed browser. Set `CHROMIUM_PATH` for a custom executable.
