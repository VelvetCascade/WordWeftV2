# Issue 208 verification

Before → after: Unread, type and search filters hid Load more whenever the loaded page had no matches. Pagination now remains available while older pages exist, and the empty state says that only loaded notifications were searched. Failed pagination retries the same page without resetting the filter; successful pages advance the cursor and merge by notification ID so overlapping pages preserve live arrivals without duplicate rows.

The production baseline leaves all six filtered desktop/mobile states on page 0 with no Load more control; the regression fails its truthful-empty-state assertion. The fix reaches the older matching notification for Unread, Social and Search at 1440/390px. A failed Unread page retries [0,1,1], other filters request [0,1]. All retain the selected filter/search, stop pagination after exhaustion, show accurate exhausted-empty copy, and retain 22 unique chronological rows plus the correct two-unread count when a live notification overlaps the older response.

Authentication uses the disposable local backend. Schema-shaped synthetic notification pages and an EventSource fixture make pagination failure, overlap and live arrival deterministic; request evidence records page numbers and rendered results without tokens.

Reproduce: `E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-208-notifications.mjs`. Set `AUDIT_OUTPUT` for screenshots and JSON measurements. `AUDIT_BASELINE=1` records the original empty states. A disposable local backend with the synthetic reader account is required.

The baseline fails the truthful-empty-state assertion; all six fixed browser scenarios pass. `npm test` (320 passed), `npm run typecheck`, and `npm run build` passed (existing bundle-size warning).

Screenshots contain synthetic local data only. Mobile is Chromium viewport emulation; physical iPhone and native Safari were not tested.
