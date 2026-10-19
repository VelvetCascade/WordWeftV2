# Issue 195 verification

Before → after: feature bullets and chapter/minute/book challenge labels retained Light colors on Dark surfaces. Scoped support foreground tokens now follow the selected appearance; completed and unjoined cards retain their layout and palette hierarchy. Dark feature text rises from 2.745:1 to 7.759:1 and challenge metadata from 2.324:1 to 7.126:1.

The production baseline fails all four Dark contrast checks. The fix passes all eight rendered/axe checks across Features and Events, Light/Dark, and 1440/390px. Events includes one completed chapter goal and two unjoined minute/book goals; join buttons remain available.

Challenge responses use deterministic synthetic completed/unjoined fixtures; account authentication uses the disposable local backend. Checks measure the actual feature bullets and all challenge metric/completion labels.

Reproduce: `E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-195-contrast.mjs`. Set `AUDIT_OUTPUT` for screenshots and JSON measurements. Synthetic local data only. Mobile is Chromium viewport/touch emulation; physical iPhone and native Safari were not tested. Scoped contrast checks are not a complete WCAG audit.
