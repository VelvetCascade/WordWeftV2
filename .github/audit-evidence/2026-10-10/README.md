# WordWeft production frontend audit — 2026-10-10

Audit-only evidence for GitHub issues labelled `codex-audit`. **No application implementation changes.**

- Audited production source: `4055dbf32044d69afa0679a932e22b240117143a`. Production still pointed to this SHA when publishing began.
- Actual source ran locally at http://127.0.0.1:3010 against a disposable local Spring/Mongo preview.
- Screenshots are fresh browser captures of existing production source, not generated mockups or future designs.
- Data is synthetic local fixture data. Local story/chapter IDs in evidence URLs do not identify public production content.
- Accounts, credentials, authentication tokens, application logs and customer data are excluded.
- Chromium desktop and mobile/touch viewport emulation; 34 routes in desktop/mobile Light, plus eight mobile Dark states (76 baseline states).
- Four rich-content routes were checked at 48 widths each, from 280 to 2560px (192 geometry samples). This does not mean every interaction was tested at every width.
- Focused checks cover independent reader themes, long titles, tables, disclosures, chapter find, modal focus, tips/settings overlap, keyboard search selection, blocked-ad fallback and HTTP 503/retry.
- `npm run typecheck`: passed. `npm run build`: passed (client and 17 static SEO pages). `npm test`: 320 passed, 0 failed.
- No lint script exists in package.json. No application code was edited, no new implementation tests were added, and no deployment was requested.

## Evidence interpretation

`baseline.json` records route/role/viewport and axe findings. `interaction-evidence.json` includes the focused DOM/focus/rectangle/contrast measurements. `responsive-geometry.json` records the width checks. `findings.json` is the issue specification before final GitHub links were inserted.

Screenshots alone do not prove keyboard traversal or contrast ratios; pair them with the JSON and source references in each issue. Contrast results are specific findings, not full WCAG certification. Ad fallback was simulated with an empty third-party script, not measured on the live ad network. The invisible-tip check used programmatic focus and is described that way in its issue.

## Coverage limits

No physical iPhone, native Safari/WebKit, Firefox, OS on-screen keyboard or screen-reader session was available. Mobile emulation cannot certify the previously reported intermittent iPhone tap/crash behavior. All 17 generated SEO pages built, but not all were separately browser-tested. Community post/circle detail flows, exhaustive auth/email delivery, every editor tool and full publication combinations were not exhaustively exercised. Those remain follow-up validation, not invented confirmed defects.

The baseline produced no page errors and no accidental document-wide horizontal overflow. Missing-cover fallback, long-word containment, stable Story Guide rendering and book HTTP 503 → Try again recovery worked in the focused captures. These successes do not certify all production journeys.

## Screenshots

Full-size PNG captures are stored in `screenshots/`; filenames match the JSON evidence. The issue bodies embed immutable-commit raw URLs so later source changes do not alter their proof.
