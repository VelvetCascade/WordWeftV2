# Fix WebKit history-write SecurityError

Reported incident: `WW-mut87q15-tzkf4`, build `f642091174c6-mut7yl9z`, screen `/category`, 4 October 2026. Error: `Attempt to use history.replaceState() more than 100 times per 10 seconds`.

## Cause

The shared navigation scroll listener called native `history.replaceState()` once per animation frame. Continuous scrolling could exhaust WebKit's history budget, shared with subsequent route and page-state updates. The catalogue filter/view effect then became the next throwing call and the application boundary showed its error page. Catalogue, search, settings, support, author and community state effects also wrote directly, including on each keystroke.

This is a frontend history-write failure. No backend/database change is required. The previous Chromium journey tests did not enforce WebKit's native history quota; these regressions now explicitly do so.

## Change

- `utils/historyEntryState.ts` merges changed metadata and coalesces optional native persistence at 500ms intervals. Current choices and positions remain immediately available in memory; UI state and real route changes are not delayed.
- Native navigation flushes the latest outgoing position/state before leaving. Page hiding also flushes. Identical snapshots do not consume a write.
- Pending metadata is keyed by history-entry identity and full URL. Browser Back/Forward before the timer reads the correct pending snapshot instead of losing the last change or applying it to another page. The cache is bounded to 80 pending entries.
- Existing filter/search/settings/support/author/community readers and writers use the shared helper. Undefined deletion markers keep cancelled/submitted drafts from being resurrected by an older queued update.
- If native optional persistence still encounters a `SecurityError`, the state is retained and retried slowly rather than unmounting the page. URL-changing navigation remains synchronous.
- Existing account ownership checks, filters, scroll restoration, publication/editor locks and route semantics are retained. No UI layout, Mongo schema, backend contract or new production telemetry is changed.

## Verification

Before the source change, two browser reproductions failed under the reported 100-writes/10-seconds quota: 180 alternating scroll frames followed by a catalogue view change, and rapid 150-character catalogue typing. Both reached the application's error boundary. After the change they pass with zero rejected history operations; the continuous-scroll test also requires fewer than 35 native writes through the entire journey.

- **230 frontend unit tests passed**, including six focused cases for merged/latest state, duplicate suppression, immediate outgoing flush, entry isolation, draft deletion and slow SecurityError retry.
- **25 Chromium browser checks passed** across the main 22-case run, two community-return checks and the extra rapid-feedback regression. Coverage includes catalogue filter/sort/view/query/page restoration; Back/Forward before persistence; settings, policy/support and notification round trips; reader discussion/focus and writer comments on touch viewports.
- **11 WebKit-engine browser checks passed**: five catalogue cases, all four new history regressions and both reader/writer touch-control cases. A local missing graphics library initially prevented launch; the library was supplied outside the repository and the browser then executed the passing cases. Host-library validation was bypassed only for the local extracted library path, not application assertions.
- TypeScript, production/SSR/17-page SEO build and entry bundle budget passed. Initial JavaScript: **163.36 kB gzip**.
- Independent focused review reported no concrete blocker and independently reran all six helper tests.

The first follow-up scroll assertion differed by one browser-rounded pixel; it now accepts less than three pixels of positional difference. The feedback stress case switched to its accessible textbox role after a filled wrapping-label locator failed. These harness corrections did not change product behavior. Initial unavailable-runtime/library runs are not represented as product regressions or passing checks.

Physical iPhone hardware is still unavailable. The supplied incident's specific history-quota crash is reproduced and covered in both engines; this does not prove every unrelated intermittent tap or error report is resolved.

## Applying the incremental delivery

Current production: `f642091174c68e8562fd70e3a59ab877b043505f`. All eight modified existing source files were checked through GitHub and their pre-change blob hashes match this production commit exactly. Git fetch then succeeded and confirmed that production's entire tree equals the tested local reference. The fix is based directly on that production commit. The patch includes only this fix, its new helper/tests and this report. No earlier redesign or quality patch is required again, and there are no binary assets to copy.

Apply the patch to a clean branch from this production commit with IntelliJ Apply Patch or `git apply --check` followed by `git apply`. Include all new files, commit and deploy the frontend. Existing backend deployment can remain. If production has moved, inspect patch applicability first. A freshly deployed build should have a different diagnostic build ID from the reported `f642091…`.

Local execution evidence: `/tmp/wordweft-history-{red,browser-final,feedback,webkit-final,unit,type,build,bundle}.log` and the community-return cases in `/tmp/wordweft-history-additional.log`. The incremental patch is checked against the actual production Git tree; all modified preimages are also independently verified by GitHub blob hashes.
