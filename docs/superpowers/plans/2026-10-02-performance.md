# WordWeft performance implementation plan

**Goal:** Reduce database work and initial loading across discovery, reading, writing, search, account, library and community flows without changing their visual design or removing features.

**Architecture:** Keep the existing paginated APIs and Spring Data MongoDB. Add non-destructive query-matched indexes, project out manuscripts from metadata reads, aggregate genre summaries in MongoDB, batch related lookups and coalesce concurrent browser reads within the current account. Keep full chapter content in its existing dedicated endpoint and preserve editor draft/release behavior.

**Stack:** Spring Boot 3.2 / Spring Data MongoDB, React 19 / Vite, Node unit tests, JUnit/Mockito, disposable local MongoDB and Playwright.

**Specification:** User-requested code-managed indexes and performance improvements across the entire application. Baseline is production commit `2980bdf`, including the user's 2-second automatic hero rotation.

**Constraints:** No data migration, dropped indexes, new uniqueness constraints, new TTL deletion policy or production writes during tests. Preserve age/content filters, published snapshots, account boundaries, view/read counting, durable reading progress, writing/import/publish and existing navigation. Atlas Search is separate from ordinary MongoDB indexes. Do not cache mutations or chapter view counting.

## Tasks

1. Measure the baseline locally: MongoDB profiling, API payload sizes and browser request counts on representative discovery, book, search, profile/library and writer journeys. Use isolated test databases or explicitly marked, automatically cleaned fixtures in the disposable local development database for large-catalog comparisons.
2. Add model index annotations and `docs/PERFORMANCE-INDEXES.md`. Validate Spring index creation, legal array indexes and explain plans against real MongoDB.
3. In `BookService` / `ContentAccessService`, replace whole-catalog genre reads with aggregation and bounded card queries, project manuscript bodies out of listings and batch author/access lookups. Add catalog regression tests for visibility, paging and payload/query bounds.
4. In `SearchService`, `UserService`, `AuthController`, `UserRepository` and `PublicSeoService`, use bounded search pages, batch projected metadata and exact reset-token lookup. Preserve fuzzy search and public SEO previews. Add focused tests.
5. Audit remaining reader, writer, library, notifications, community and analytics paths. Optimize proven overfetch or repeated work, keeping existing contracts and access checks.
6. In frontend API/loading code and affected pages, coalesce safe concurrent reads, remove redundant loads and defer below-fold requests where appropriate. Preserve account isolation and retry/error behavior. Test with Node and Playwright.
7. Run backend and frontend suites, real-Mongo checks, typecheck, production build/bundle checks and functional browser/API flows. Repeat the same local measurements and document practical limits in `docs/PERFORMANCE-VALIDATION.md`.
8. Commit the new increment, push the performance branch and open a PR. If repository writes remain blocked, deliver only the increment from `2980bdf` through the previously authorized Drive workflow.

## Review focus

Inspect metadata projections against every writer/reader consumer, ensure pagination totals match actual visibility, verify aggregation criteria against legacy missing fields, and verify concurrent request sharing cannot cross login/logout or hide mutation results. Distinguish local server performance evidence from production hosting/network latency.
