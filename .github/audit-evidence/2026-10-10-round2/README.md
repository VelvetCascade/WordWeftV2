# Production frontend audit — expanded round

Analysis and issue evidence only. Application code is unchanged.

Source: `4055dbf32044d69afa0679a932e22b240117143a` (production). Browser: local Chromium through Playwright. Fixtures: disposable local writer, reader and administrator accounts. No production content mutations.

`coverage.json` records additional captured states, not a claim that every interaction in those states was exhaustively tested. `measurements.json` contains selected DOM, request-order and accessibility observations supporting the issue screenshots. Duplicate capture names use the latest measurement. Screenshots have been visually reviewed; automated audit flags alone are not treated as confirmed product defects.

The broader pass included application Light/Dark × reader Paper/Sepia/Night × desktop/mobile, mood-section scroll states, reader settings/discussion, community composition and comments, report close/reopen, profile tab validation, shelf creation, writer tools and heading-state checks. A captured mood section does not by itself prove that every animation frame or active-mood transition was exercised.

Delayed-request and partial-outage cases use browser-controlled local responses. Corrupt-image reproduction uses an invalid local PNG fixture. The public-event failure comparison uses an explicit valid event fixture because the local database initially had no events. No outage is inferred from temporary local-service unavailability.

Limitations: no physical iPhone/Safari run, no live customer accounts, no production database modifications, no real third-party upload/payment/email delivery validation. This is not a guarantee of zero remaining issues. Audit setup/selector failures were excluded from findings.
