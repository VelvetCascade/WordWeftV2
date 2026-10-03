# App reliability and interaction validation

This increment starts after reader commit `718ee3dd71d36d85d982be95b5fa8cee2cd9af3e`. Apply the earlier reader patch first if it is not already in your checkout. This change preserves its formatted manuscript, chapter-navigation, comments and touch-control fixes.

## Confirmed causes and changes

| Reproduction | Cause | Change |
| --- | --- | --- |
| Return empty, HTML or truncated JSON with HTTP 200 for ranked genres. | The shared API parser resolved failed parsing to `null`; the page then crashed calling `.slice()`. | Required JSON rejects with a readable `ApiError`, so page-level error handlers run. Required collection reads also reject null and non-array payloads. Known text, empty and nullable backend contracts remain explicit. |
| Interrupt a lazy page import, then open that page again. | React retains a rejected lazy import; the rejection does not always produce the Vite event used by recovery. | The page boundary invokes the same guarded asset recovery. It preserves the destination and allows one automatic reload per five minutes, respecting offline state, unavailable storage and navigation locks. |
| In production WebKit, return HTTP 503 for a route module or a shared dependency, then let the request succeed. | Failed JavaScript `modulepreload` entries survive reload, so reloading can reuse the rejection rather than retrying the network. | Dynamic-route JavaScript uses native imports. Vite retains the route CSS dependencies and the entry HTML preloads. Both route and dependency failures now recover in Chromium and WebKit. Persistent failures stop after one automatic reload. |
| Store invalid JSON or a non-array for dismissed reading tips. | Optional coaching state was parsed without validation inside a React effect. | Only known dismissal IDs and valid bounded session counts are accepted. Blocked or full storage uses a tab-only fallback restricted to tip keys. Auth tokens, manuscripts and pending reading progress are not routed through this fallback. |
| Hold a button down while its feature hint appears, then release. | The hint switched between a fragment and a wrapper, replacing the pressed DOM node. | The wrapper and button identity remain stable through hint appearance and dismissal. |
| Place a control behind a tip, including a tip hidden in focus mode. | Decorative surfaces or an invisible dismiss button could intercept the press. | Decorations pass pointer input through. Visible dismiss buttons remain usable; hidden focus-mode dismiss controls cannot receive input. |
| Mount reading tips in React StrictMode. | Effect replay advanced the session counter twice and skipped first-session tips. | A mount ref advances the session once, while replay restarts that session's timers. Counts stop after the discovery sessions finish. |

## Recovery and polish

- Genres and reviews have section-level loading, error and retry controls. Tests verify retries retain the existing story/card DOM rather than replacing the page. Review composition waits for a successful review load, so an unavailable list does not look like the user has never reviewed the book.
- Ordinary rendering failures offer an in-place **Try again**. Asset failures explain why a document reload is required. Manual reload respects a live unsaved-work navigation lock.
- The boundary resets against the router's captured destination, including meaningful query changes, rather than an incomplete page descriptor. It preserves the earlier reader fix that keeps local chapter URL changes from remounting the reader on account refreshes.
- The recovery panel uses the existing typography, colors and controls, adapts to narrow screens, and gives press feedback. Tips respect reduced motion and can expose their description on keyboard focus.

## Production diagnostics

The recovery screen has **Error details → Copy error details**. It records the exception, component stack, screen, connectivity and app build. URL queries/fragments, email addresses and bearer/JWT credentials are stripped from diagnostics; private book/chapter/post identifiers are replaced in the screen path. Message and stack lengths are bounded.

The last three reports are retained in session storage under `wordweft:recent-page-errors`, so an automatic recovery does not erase the evidence. Storage and clipboard failures cannot throw another page error. Reports are not sent to a new service. Review details before sharing them.

The reported production crash has no captured production exception yet. Two anonymous mobile WebKit reading round trips on the live site succeeded during this pass. That observation does not rule out intermittent failures or establish that every production crash has the same cause. The additional details allow remaining failures to be investigated directly after deployment. A physical iPhone/iOS 27 was not available; WebKit browser verification covers the engine and touch-oriented journeys, not every device-specific behavior.

## Verification

Regression failures were observed before the respective changes, including real HTTP 503 module downloads in the production build. Final results:

| Validation | Result |
| --- | --- |
| Unit suite | 190 passed, zero failures. |
| Dedicated SEO suite | 22 passed, zero failures; these cases are also included in the unit suite. |
| Type checking | `tsc --noEmit` passed. |
| Production build | Client, server rendering and 17 static public pages built successfully. |
| Initial JavaScript budget | Passed at 160.80 kB gzip. |
| Chromium whole-app development sweep | 199 passed initially. One tip test was interrupted by a Vite restart: its trace shows refused module connections. Its complete 20-case file passed on rerun. The route-restoration harness needed an output path for the newly imported CSS; after correction, both route cases passed, including the case initially unable to run. All 202 development cases are therefore covered by passing results across the sweep and reruns, rather than a claim that the first sweep was clean. Two production-only cases were intentionally skipped at the time of collection. |
| Chromium built-app checks | 10 passed: three asset-recovery cases plus seven loading/mutation cases. |
| WebKit checks | Focused runs passed: 10 app/recovery/touch cases; 32 optional-tip, performance/UX, reader-race and formatted-content cases; one added hidden-tip case; both final delayed-route cases. Three built-app asset-recovery cases also passed. These run counts include repeated route coverage. |
| Independent code review | No remaining blockers after fixing the local-preview configuration guard. |
| Patch integrity | Delivery verifies the increment against the exact reader base using an isolated Git index and compares its resulting tree with the committed tree. SHA-256 checksums accompany the files. |

Validation covers:

- Unit response contracts, coalescing and fresh retries, durable reading-progress acknowledgements, authentication behavior, optional diagnostics, and recovery safeguards.
- Chromium desktop/mobile journeys across account creation, email verification/password reset, profile settings, community publishing/moderation, discovery/filter/search, library and shelves, reader progress/comments/reactions, writer editing/publishing, support/policies, keyboard use, accessibility and dark appearance.
- WebKit malformed-response recovery, same-document retry, navigation locks, pressed-control preservation, optional storage faults, reading controls, writer comments, styled manuscripts and late account/response races.
- Production-build HTTP failure tests for route modules and shared dependencies, persistent-failure loop prevention, and existing loading/mutation behavior.
- Type checking, production/SEO builds, SEO tests, initial JavaScript budget and independent code review.

### Repeat the production failure tests locally

With the disposable local backend running on port 8080:

```sh
SEO_API_BASE_URL=http://127.0.0.1:8080/api VITE_API_BASE_URL=/api npm run build
node scripts/serve-production-e2e.mjs
```

In another terminal:

```sh
E2E_BASE_URL=http://127.0.0.1:4173 E2E_PRODUCTION_PREVIEW=true npm run test:e2e -- e2e/production-asset-recovery.spec.ts
E2E_BASE_URL=http://127.0.0.1:4173 E2E_PRODUCTION_PREVIEW=true npm run test:e2e -- --config=playwright.webkit.config.ts e2e/production-asset-recovery.spec.ts
```

Install the appropriate Playwright browser/system dependencies for your machine. The dedicated preview binds to loopback, checks the **built** client API configuration and effective renderer backend, and refuses a production backend override. API requests and server rendering use the same local backend. Restart the preview after rebuilding its output. The production-only tests are intentionally skipped by the ordinary development-server suite.

## Database and rollback

This increment changes frontend behavior and local build/test metadata. It adds no MongoDB collection, schema, document migration or index. It preserves successful empty/nullable progress acknowledgements and durable pending progress retries. Reverting this increment does not require a database rollback.
