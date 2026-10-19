# Report dialog lifecycle — #188

Before → after uses the same held report submission at 1440×1000 and 390×844. Before, Cancel and Close remain enabled while Escape is blocked. After, all dismissal routes consistently wait for completion, keeping the report receipt attached to the submitted target and avoiding accidental duplicate reports.

The real application runs against a disposable local backend; report POST responses alone are intercepted to hold timing, simulate failure, and supply synthetic receipts. No moderation report is filed. The parent-target harness uses the production ReportModal to prove that old success/failure cannot update a replacement target. Retry preserves category and context; Done restores focus to Report.

Reproduce: start the app with the disposable backend on 8080, then run `E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/report-session.spec.ts`. Set `AUDIT_CAPTURE=after` to refresh matched images. Chromium desktop/mobile emulation; no physical iPhone/Safari claim.
