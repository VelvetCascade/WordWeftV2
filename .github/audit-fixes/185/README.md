# Issue 185 verification

Before → after: a current www.threads.com profile URL showed Invalid threads URL format and disabled profile saving. Threads validation now parses HTTPS URLs, accepts the exact current/legacy hosts with optional www, and requires a single @profile path. Lookalike hosts, credentials, query/fragment suffixes, insecure schemes and extra path segments remain rejected; the placeholder uses threads.com.

The production regression fails because the current-domain URL displays the validation error. The fix passes at 1440px and 390px: four current/legacy URL variants are accepted, eight malformed/external variants are rejected, invalid values disable Save Changes, and an accepted current-domain link reaches the profile PUT request.

Authentication uses the disposable local backend. The final profile PUT is intercepted to record only its synthetic Threads value without changing the shared fixture account. This verifies URL syntax and form submission, not whether a remote Threads account exists.

Reproduce: `E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-185-threads.mjs`. Set `AUDIT_OUTPUT` for evidence. Synthetic local fixtures; mobile is Chromium viewport emulation. Native Safari was not tested.
