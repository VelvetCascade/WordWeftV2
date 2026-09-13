# WordWeft SEO implementation and launch guide

Implemented September 2026. The code is ready for deployment and verification; this workspace change does not itself update the live website or submit anything to search engines.

## What changes for visitors and search engines

WordWeft connects original fiction, an adjustable browser reader, author profiles, chapter publishing, and a writing studio with character and world notes. SEO now has two entry points: people looking for a particular story or author, and people looking for a reading platform or writing tool.

Public pages return meaningful HTML before JavaScript runs. Existing interactive React pages then load normally. The server uses the same anonymous content eligibility for every visitor; it does not identify Googlebot to reveal extra content. Clean URLs replace fragment routes, and existing `#/...` links still open through the compatibility router. Chapter URLs use stable chapter IDs instead of positions, so reordering chapters does not change their canonical addresses.

| Content | Search policy |
| --- | --- |
| Homepage, About, Contact, policies, and four discovery pages | Public HTML, distinct metadata, canonical URLs |
| `/features` | Same feature showcase as the anonymous homepage; canonical points to `/` |
| Published book with at least one published chapter, ALL_AGES or TEEN_13 | Indexable synopsis, author, genres, tags, cover and chapter links |
| Published chapters of eligible books | Indexable chapter text; manuscript marked `data-nosnippet` to reduce spoilers in search snippets |
| Authors with eligible published books | Public bio and paginated book directory; empty portfolios are noindex |
| Genre pages with eligible books | Indexable, paginated directory |
| Tags shared by at least three eligible books | Indexable, paginated directory; thinner tags remain browsable with noindex |
| Draft/scheduled chapters, unpublished books, mature/age-restricted stories | Excluded from the anonymous HTML feed and sitemaps; direct public HTML returns 404 |
| Writing studio, account pages, authentication, reset tokens, internal search, community/activity utilities | Noindex; existing account and content permissions still apply |
| Missing pages | Actual HTTP 404 instead of an indexable homepage fallback |
| Backend outage | Retryable HTTP 503 with Retry-After, instead of misreporting deleted content |
| Preview deployments and alternate hosts | Noindex; canonical remains the production domain |

The authenticated editor, saved library and private drafts do not need to be indexed. Public feature pages explain those capabilities and lead visitors into signup/sign-in. This is how a login-based product can acquire users through search while retaining private workspaces.

## Search intent and keyword map

These are relevance-based targets, not measured search-volume rankings. No Keyword Planner or Search Console account data was supplied. Current search results and primary product pages support the distinction between reading fiction, drafting a novel, publishing a serial, and organizing a fictional world: [Inkitt](https://www.inkitt.com/), [Reedsy's online writing app](https://reedsy.com/studio/write-a-book/), and [Campfire's worldbuilding tools](https://campfirewriting.com/worldbuilding-tools). Competitor copy and claims have not been copied.

| Page | Primary searches to serve | Supporting intent |
| --- | --- | --- |
| `/read-online` | read stories online, read novels online | original fiction, independent writers, adjustable online reader |
| `/writing-tools` | online novel writing tools, story writing app, online story editor | organize chapters, manuscript import, character profiles |
| `/publish-stories` | publish stories online, share writing online | publish a web novel, serialize a story, schedule chapters |
| `/world-building-tools` | worldbuilding tools for writers, character profiles for writers | organize story lore, character notes, fictional world planning |
| `/genre/Fantasy`, other real genres | fantasy stories online, romance novels online, mystery stories | Actual eligible genres and books, created from the catalog |
| `/tag/<tag>` | Relevant story themes and tropes | Only tags with enough published inventory become indexable |
| `/book/<id>` and its chapters | book title, title + author, chapter title | Synopsis, tags, genre and stable chapter links |
| `/author/<id>` | author name, author name + stories | Public portfolio and book discovery |

The four acquisition pages contain useful product-specific explanations, practical steps, FAQs, internal links, and working calls to action. Do not add dozens of near-identical keyword pages or unsupported promises such as print distribution, guaranteed income, offline apps, or AI manuscript generation. Broad terms such as “writing tools” are competitive; accurate longer queries and individual story/genre searches provide more specific opportunities.

## Deployment order

1. **Deploy the backend first**, using the existing Spring Boot/Render process. It adds anonymous read-only `/api/public/seo/book/{id}`, `/author/{id}`, `/catalog`, `/sitemap`, and `/sitemap/{kind}` endpoints. No database content migration or credential change is needed. Keep existing authentication and content-access configuration.
2. **Set both API addresses in Vercel** to the deployed backend, including `/api`: `VITE_API_BASE_URL` for the browser and `SEO_API_BASE_URL` for server rendering. The existing project's expected backend is `https://wordweftv2.onrender.com/api`; confirm that this is still the active service. Neither variable may point at localhost on Vercel. The backend's existing CORS configuration must allow `https://wordweftstudio.com` for the browser API.
3. Use **Node 22.18+ (22.x) or Node 24** for installation/build/tests. Run `npm ci` and `npm run build`. Vercel uses the committed `vercel.json` and generated **Build Output API** artifact at `.vercel/output`; the HTML function uses Node 22. Do not deploy only `dist/` as a static SPA: that omits dynamic book HTML, correct statuses and sitemaps. Remove any dashboard override that bypasses the repository build command or rewrites every URL to `index.html`.
4. Keep **`SEO_NOINDEX=false` or unset on production**. Vercel preview builds are noindex automatically. `SEO_NOINDEX=true` can explicitly protect a staging environment. If its build-time value changes, rebuild; a noindex build remains protected.
5. Confirm the apex domain `wordweftstudio.com` points to this deployment and HTTPS works. Attach `www.wordweftstudio.com` to the same Vercel project so the included permanent redirect can run. Changing the production domain later requires updating `seo/content.mjs`, `public/robots.txt`, preview hostname checks, backend share URLs, and any existing auth/CORS settings together.
6. Run `node scripts/verify-seo.mjs https://wordweftstudio.com` after both deployments. It checks initial HTML, noindex routes, real 404s, redirects, sitemap availability and a real published book/chapter if present. Use a Vercel preview first to check rendering and login; preview intentionally remains noindex.

The dynamic renderer has a 12-second upstream deadline. Keep the backend available and monitor response times; frequent cold starts/timeouts will return 503 and hurt crawling. Dynamic pages deliberately avoid CDN caching so unpublishing a story takes effect on the next request. Public static pages use one-hour CDN caching; previews stay uncached. Hashed application assets receive immutable caching. Tailwind is compiled during the build instead of running the CDN compiler in visitors' browsers.

## Search Console and Bing: account steps

1. Open [Google Search Console](https://search.google.com/search-console) and add a **Domain property** for `wordweftstudio.com`. Add the exact TXT record it provides to your DNS provider, then verify. This requires your account/domain access; no verification token has been invented or published by this implementation.
2. Submit `https://wordweftstudio.com/sitemap.xml` in Sitemaps. This is a live sitemap index: public static pages plus partitions for eligible books, chapters, authors, genres and tags. Each child holds at most 1,000 entries. New publications appear automatically; a frontend rebuild is not needed for each story.
3. Use URL Inspection → Test Live URL for `/`, all four acquisition pages, one genre, one book and one chapter. Check the rendered text, canonical and crawl permissions. Request indexing for the key launch pages. Google chooses whether and when to index; a submitted sitemap is a discovery signal.
4. Check that a draft book, account/profile page and search-results page are not indexable. Test a known mature story while signed out and confirm it is absent from the public sitemap. These checks must use the correct account/content context.
5. Add the site in [Bing Webmaster Tools](https://www.bing.com/webmasters/) and submit the same sitemap, or use its Search Console import if available to your account.
6. After deployment, inspect the Page Indexing, Sitemaps, Search Performance and Core Web Vitals reports. Compare 28-day periods, separating brand searches (“WordWeft”) from non-brand discovery. Track impressions, clicks, click-through rate, landing pages, and signup/reading/writing activity through the existing product analytics. Inspect rich markup with [Schema.org Validator](https://validator.schema.org/); use Google's Rich Results Test only for supported result types. Book/Chapter schema does not guarantee a book carousel or rich result.

## Ongoing work that affects rankings

Authors should use original, readable synopses; accurate genre and trope tags; a recognizable public name; an appropriate cover; and complete published chapters. Improve weak book descriptions through the author's normal editing flow rather than manufacturing content. Maintain moderation and remove spam. Do not publish drafts just to grow the sitemap.

Use actual Search Console queries to decide the next content work. Good candidates are a tutorial on importing and reviewing a manuscript, a guide to publishing a first serial, and a worked example of building character notes. Each should use real product examples and an identifiable author/editor, then link to its matching tool page. Update existing pages when features change. Earn relevant links through real author portfolios and useful resources; avoid paid link schemes and mass outreach spam.

The existing robots exclusions for AI/data-extraction agents are retained. Some of those agents also power assistant discovery (for example ChatGPT-User and PerplexityBot), so this is not a promise of visibility in every AI assistant. Google/Bing web crawling is allowed. Any change to the creator-content/AI access policy should be an explicit product decision.

No SEO implementation can guarantee first place, indexing every page, or appearing for every search. The implementation removes technical barriers and creates relevant acquisition pages; competitive rankings also depend on useful content, demand, reputation and search engines' choices. See Google's [SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide).

## Verification and maintenance

Verified locally on September 13, 2026: 41 frontend tests and 94 backend tests passed, TypeScript compilation and the production build passed, and the existing entry-bundle budget passed (about 143.5 kB gzip). The fixture browser regression passed nine public routes with JavaScript disabled, mobile overflow checks, desktop click-throughs, legacy links, chapter/back navigation, author and genre pagination, returning-user sign-in, first-time onboarding, and preview noindex persistence. These checks used isolated sample data and installed headless Edge.

Local commands:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run check:bundle
npm run preview:seo
# In another terminal, with the backend running at the configured address:
node scripts/verify-seo.mjs http://127.0.0.1:4173
# Backend, using Java 17 and Maven:
cd backend
./mvnw test
```

`npm run preview` remains Vite's static preview; use `preview:seo` when checking crawler HTML and dynamic routes. Unit tests cover public/private visibility, hostile text escaping, URL migration/redirects, stable chapter IDs, canonical/schema consistency, preview policies, sitemap partitioning and retryable failures. Backend tests cover privacy projections, draft access and Mongo aggregation mapping. Before launch, also exercise real sign-in, reading, author pagination and chapter publishing on the deployed preview; local fixture tests do not validate your production database, DNS, provider credentials or search indexing.

Implementation rationale follows Google's [JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) for HTML, crawlable links, canonical consistency and HTTP statuses, and its [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) for canonical URLs and accurate modification dates. Schema describes visible content; no review scores, pricing, book-action integration or ranking claims are invented.


The retained fixture browser regression is `scripts/verify-seo-browser.mjs`. It starts a local HTML server and an isolated mock API, blocks external requests, and writes screenshots under ignored `scratch/seo/`. With Playwright available, run `node scripts/verify-seo-browser.mjs` after a production build. Use `PLAYWRIGHT_MODULE` to select an already installed module and `SEO_BROWSER_EXECUTABLE` for an installed Chromium/Edge executable; otherwise install Playwright locally and its Chromium browser first. It does not sign in to or write to the real platform.
