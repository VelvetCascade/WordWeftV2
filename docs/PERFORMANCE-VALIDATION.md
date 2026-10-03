# Performance validation

The performance increment starts at production commit `2980bdf32820893689ff6791c2994c0ec1aab7da`. It preserves the existing redesign, features and the user's 2-second homepage word/cover rotation.

## Changes

- Spring creates 32 additional ordinary, nonunique indexes for catalog sorting, author/taxonomy queries, scheduling, book/chapter relationships, progress, analytics, notifications, community quotas/reactions and password-reset lookup. See [the index inventory](PERFORMANCE-INDEXES.md).
- Catalog, genre shelves, portfolios, libraries, search, SEO, progress and analytics read metadata instead of transferring entire chapter manuscripts. Dedicated reader/editor content endpoints retain the actual published and draft content. Read-only projected books are never saved.
- Genre summaries run in MongoDB; homepage shelves fetch bounded card results and batch authors. Search applies visibility before counting/paging instead of loading and truncating up to 500 results. Hook discovery fetches metadata windows and only the opening chapter bodies it needs.
- Comment author enrichment uses one public-profile batch per chapter. Writer conversations keep every comment while limiting chapter requests to four at once and cancelling queued work after navigation.
- Overlapping safe metadata reads share an in-flight network request. Completed responses are not retained. Mutations and account transitions invalidate sharing; session generations prevent a delayed 401 from logging out a later session, even if its JWT is identical.
- Library/shelf changes retain the book page and update the relevant controls without repeating book, review, progress or character reads. Homepage requests seven displayed stories and defers lower genre shelves until they approach the viewport.
- Catalog toolbar geometry is corrected at desktop and mobile widths. Recognized page-asset loading failures recover once at the same URL; offline state, unsaved work, unavailable storage and ordinary application errors preserve manual recovery.

## Local before/after measurement

Both runs used the disposable loopback backend and MongoDB 7.0.43, with 200 additional published books, each carrying two long draft/published chapter bodies. MongoDB profiling counted responses for the relevant book/user/progress/library/shelf collections during each request. The temporary performance books were deleted and profiling disabled after each run. Tests never wrote to production.

These are database response bytes, not browser download bytes. The old API already hid manuscript fields in its HTTP DTOs, but fetched the manuscripts internally. The new projections remove that database transfer.

| Endpoint | Database operations before → after | Database response bytes before → after |
| --- | ---: | ---: |
| `/books?page=0&size=12` | 41 → 6 | 4,619,242 → 20,432 |
| `/books/home-genres` | 240 → 10 | 83,411,863 → 22,111 |
| `/books/genres` | 216 → 4 | 83,387,320 → 788 |
| `/books/genres/ranked` | 216 → 4 | 83,387,320 → 1,215 |
| `/books/hero` | 21 → 7 | 167,937 → 7,766 |
| `/users/me` | 20 → 11 | 66,079 → 14,040 |
| `/reading/progress` | 4 → 4 | 20,034 → 1,857 |

Single local request timings for genre shelves were 875.8 → 89.4 ms; genre values 568.5 → 56.5 ms; ranked genres 493.1 → 27.8 ms. Other first requests were slower in the second run despite less database work. These cold JVM runs do not establish production latency or p95; response bytes and query counts establish the removed work. Hosting wake-up time, network latency, concurrent load and data distribution still affect the live site.

The separate 2,000-document planner fixtures exercise 36 unhinted selective queries. A representative 20-book sort examines 20 documents with the new index; the previous plan examined 2,000 with a blocking sort. Visibility residuals, counts, computed rankings and taxonomy aggregation can still inspect additional metadata in real catalog queries. Indexes do not make those operations constant-time.

The real browser fixture for 12 commented chapters previously dispatched 24 simultaneous requests under StrictMode. It now dispatches 12 total, at most four at once; leaving during the first batch dispatches only four. Total conversation reads still scale with the number of commented chapters.

## Verification

- Full backend suite: 292 tests, zero failures/errors/skips, including 56 cases against real disposable MongoDB databases. Coverage includes automatic index creation/plans, snapshot/draft metadata, access restrictions and legacy fields, paging totals, batched authors, exact reset tokens, projected authentication, hook ranking, SEO previews, progress completion concurrency and analytics ownership.
- Frontend unit suite: 127 tests passed. TypeScript typecheck, production frontend/SEO build, entry-bundle check and 22 dedicated SEO tests passed. Initial JavaScript is 161.03 kB gzip, within the existing budget.
- Backend production package passed. Local API integration passed 139 assertions across 90 requests, including registration/OTP/reset, reader/editor access, progress, library/shelves, comments/reviews, draft/release/revision/scheduling, import/planning, community/moderation, notifications and cleanup.
- Independent source review found no unresolved Critical or Important issues. Its stale-session and null-comment-author findings were fixed and covered.

The full Chromium browser suite passed all 165 tests (10.7 minutes), covering real reader/writer/account/community flows, page returns, accessibility, responsive surfaces and the new performance checks. WebKit passed all 12 new performance/UX browser checks and a separate 18 single-tap mobile navigation sequence without page or console errors. WebKit used an emulated iPhone viewport and touch input; this was not a physical-device test.

Re-run from the repository using an authorized disposable MongoDB instance:

```bash
cd backend
WORDWEFT_TEST_MONGO_URI=mongodb://127.0.0.1:27028 mvn test
mvn -DskipTests package
```

From the repository root:

```bash
npm test
npm run typecheck
npm run build
npm run check:bundle
npm run test:seo
```

For local API and browser integration, start the existing disposable backend with `scripts/dev-local-backend.sh` and the frontend on port 3000, then run `npm run test:api:local` and `npm run test:e2e`. The scripts reject production hosts. Image-worker/R2 and Google OAuth services are deliberately unconfigured locally; their successful external integrations were not exercised.

## Deployment and rollback

Deploy the backend and frontend together. Spring's existing `spring.data.mongodb.auto-index-creation=true` creates missing ordinary indexes; the database account must have index creation permission. Existing collections can take additional startup time while MongoDB builds indexes. Verify deployed definitions and representative plans using the commands in the index inventory.

No document migration, schema rewrite, dropped index, new uniqueness constraint or new TTL deletion policy is introduced. Rolling back the application leaves additive nonunique indexes in MongoDB; the previous code continues to use the same document shape and endpoints. New metadata projections are read-only and the detail counter update is atomic rather than a replacement of the entire book.

Atlas Search indexes are separate from ordinary Spring-created indexes. Existing fuzzy search still uses `booksSearchIndex` and `userSearchIndex`; standalone MongoDB fallback and Atlas pipeline contracts were tested, but no live Atlas Search deployment was available for execution. Case-insensitive substring regex search and deep offset paging retain scan/offset costs. Author/writer portfolios retain all metadata needed by existing counts and editing flows; writer conversations retain one request per commented chapter. These remaining costs are documented rather than hidden by stale caching.

The intermittent physical-iPhone tap failure and the screenshot's underlying exception were not reproduced locally. The screenshot is a generic error boundary and contains no stack trace. Page-asset recovery addresses recognized failed imports without hiding ordinary runtime errors or discarding unsaved work; it is not proof that every production error has the same cause.
