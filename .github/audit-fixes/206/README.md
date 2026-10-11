# OTP resend pending request regression

Run Vite on port 3024, then `node .github/audit-fixes/206/regression.mjs`.

Before the fix the regression failed because Resend Code remained enabled during the delayed request. After the fix both 1280px desktop and 390px mobile Chromium pass: one request while pending, disabled sending feedback, failed delivery returns to usable retry, and successful retry starts the cooldown. Screenshots show the pending state. The test intercepts authentication and resend responses locally; no email is delivered. Native Safari and physical screen-reader testing are outside this verification.
