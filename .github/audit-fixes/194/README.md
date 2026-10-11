# Shelf creation pending lifecycle (#194)

A pending creation uses one consistent dismissal policy: Close, Cancel, Escape and the backdrop retain the dialog until the request settles. Name and privacy controls are disabled while submitting, so the successful response cannot erase a newer editable draft. Failure retains the submitted name and privacy for retry. Success resets the next form and returns focus to New shelf.

Regression: `node .github/audit-fixes/194/regression.mjs` against the local production-source Vite server on 3026 and disposable backend on 8080. The script reads synthetic fixture credentials locally; no credentials are included here. Browser: Chromium, desktop 1280px and mobile/touch 390px. Native Safari was not tested.

Before the fix the regression failed with `false !== true`: Close was enabled while Creating. After the fix it verifies disabled controls, Escape/backdrop retention, one request, delayed failure draft preservation, delayed real-backend success, public shelf visibility, clean next form, and focus restoration. Created success fixtures are deleted after verification.

Screenshots: desktop/mobile retry and successful creation. No production data or production writes.
