# Reader coaching yields to reading controls (#173)

Before: a scheduled tip covered Reading preferences; focus mode only made its Dismiss tip button transparent, leaving it focusable. After: coaching pauses across reader overlays and focus mode and removes its interactive DOM immediately. Closing an overlay resumes remaining tips in the same session; dismissed/completed tips are not replayed.

Matched captures use the same synthetic chapter, reduced motion, and 390×844, 740×360, and 1440×1000 Chromium viewports. `before-*` runs production `4055dbf`; `after-*` runs this change. Measurements include deliberately focusing the hidden baseline Dismiss button, demonstrating opacity-only hiding before and no coach/button after. These are browser emulations, not physical iPhone or native Safari tests.

Reproduce with the app running, using `E2E_BASE_URL` and `AUDIT_EVIDENCE_DIR`, then `AUDIT_PHASE=before|after node .github/audit-fixes/173/capture.mjs`. All API data is synthetic and intercepted. The regression spec exercises preferences, contents, passage tools, sharing, comments, focus mode, keyboard dismissal, same-session resumption and non-replay.

Validation: baseline browser regression failed because a coach remained under an active surface; fixed focused browser checks pass. Full 320 unit tests, TypeScript and production/SSR builds passed (the existing chunk-size advisory remains).
