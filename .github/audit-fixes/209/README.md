# Review reply ownership (#209)

Before: two synchronous submissions send two POSTs, the pending composer accepts a newer draft, and errors escape without local feedback. After: a synchronous in-flight guard permits one active request, posting controls stay unavailable, and failures announce a recoverable local error. The draft stays intact and one retry saves one reply. A response for an earlier story cannot replace the newly opened story's reviews.

The paired `before/pending-390.png` → `after/pending-390.png` and `before/pending-1440.png` → `after/pending-1440.png` show the same synthetic review card, keyboard attempt and viewport (cropped to the card for legibility). `after/failure-390.png` shows the accessible error and retained draft. `red.txt` records the baseline request count: expected one, actual two.

Reproduce with the portable Playwright suite:

```sh
E2E_BASE_URL=http://127.0.0.1:3025 npx playwright test e2e/review-reply-ownership.spec.ts --reporter=list
AUDIT_MOBILE=1 E2E_BASE_URL=http://127.0.0.1:3025 npx playwright test e2e/review-reply-ownership.spec.ts --reporter=list
```

All API responses are scoped synthetic browser fixtures; no backend mutation or credentials are required. The suite checks duplicate synchronous submission, keyboard attempts, cancel/toggle availability, HTTP/offline/malformed-response failure, successful retry without page errors, and navigation during a pending reply. Proof uses desktop 1440px and Chromium touch emulation 390px; native iPhone/Safari is unverified.

Independent branch from production 4055dbf. Shared-file overlap: BookDetailsPage.tsx and api/client.ts.

Validation: all 320 unit tests, TypeScript, and the production/client/server/SEO build passed. The complete five-case browser suite passed on desktop and mobile; proof recapture changes only the screenshot crop.


## Independent reply responses

Two review composers remain usable in parallel. Each successful reply reconciles only the requested review's additive reply IDs, preserving unrelated current review fields and saved replies. This prevents an older whole-list snapshot from erasing another successful submission.

`concurrency-before/reordered-1440.png` → `concurrency-after/reordered-1440.png` and the 390px pair show the same two synthetic replies after delivering response 2 before response 1. Before, reply 2 disappeared despite its cleared composer. After, both replies remain visible. The `reordered-red*.txt` and `review-fix-*.txt` records include the request order, response order, visible reply counts and cleared second form. The regression was red on desktop and mobile before this correction, then all five browser cases passed on both viewports; 320 unit tests, TypeScript and production/SSR/17-page SEO build also passed fresh.
