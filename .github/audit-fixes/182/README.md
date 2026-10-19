# Issue 182 verification

Before → after: administration kickers, timestamps, metric helpers, chart day labels and footer text used hardcoded muted colors that failed on canvas and panel surfaces. Reusing the existing admin accent and copy tokens raises the measured minimum from 3.252:1 to 4.840:1 in Light and from 3.371:1 to 6.651:1 in Dark. Layout, typography, metrics and access controls are unchanged. The Dark Refresh button now uses the admin panel surface behind its existing theme-aware ink, raising its contrast from 1.171:1 to 13.050:1 while preserving the Light button.

The production baseline fails 16 of 20 rendered contrast checks. The fixed regression passes all 20 checks across Light/Dark, 1440/390px, populated/empty overview data, refresh and failed-load/retry states, with no scoped axe contrast violations. An ordinary-member session remains denied management data.

Overview responses are intercepted with deterministic synthetic fixtures to compare the same counts, timestamp and chart labels; authentication and the admin route use the disposable local backend. Actual rendered chart labels are measured even where axe excludes descendants of role=img.

Reproduce: `E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-182-contrast.mjs`. Set `AUDIT_OUTPUT` for screenshots and JSON measurements. Synthetic local data only. Mobile is Chromium viewport/touch emulation; physical iPhone and native Safari were not tested. Scoped contrast checks are not a complete WCAG audit.
