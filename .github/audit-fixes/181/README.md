# Founding Writers helper contrast — issue 181

Production baseline: `4055dbf32044d69afa0679a932e22b240117143a`.

Before → after: six required/optional helpers, sample counter and privacy note used muted gray at 4.378:1 on the pale green form. Reusing the existing page green-gray raises the minimum to 5.499:1. Dark remains 6.916:1. Layout, instructions and form behavior are preserved.

The actual rendered regression fails four Light checks on the baseline and passes all eight checks after the fix, at 1440×1000 and 390×844 in Light and Dark. Both appearance/viewport combinations also exercise counting, invalid attachment rejection without a request, valid attachment review, simulated failed submit and successful retry. Submission responses are intercepted locally; no application is delivered.

`before-contrast.json` and `after-contrast.json` contain computed foreground/background ratios and scoped axe color-contrast results. Matched PNGs are captured by the same script with the source CSS temporarily restored to production for the baseline.

Reproduce against the disposable seeded backend: `E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_OUTPUT=/path/to/proof node e2e/audit-181-contrast.mjs`.

Synthetic local fixture only. Mobile is Chromium viewport/touch emulation; physical iPhone and native Safari were not tested. These scoped checks are not a complete WCAG audit.
