# WordWeft Search Console diagnosis and SEO priorities — October 9, 2026

Source: three owner-provided Google Search Console ZIP exports dated October 9, 2026:
`Coverage`, `Coverage-Drilldown`, and `Performance-on-Search`.
This document contains only aggregated measurements; original Google exports,
query-level privacy data and URLs are not committed to the repository.

## Baseline: what Google actually reported

Coverage export's latest date: **October 4, 2026**.
Search performance export's latest date: **October 6, 2026**.
The data is a delayed snapshot, not a live API feed.

| Indexing classification | URL count |
| --- | ---: |
| Indexed | **10** |
| Not indexed | **78** |
| Discovered — currently not indexed | **68** |
| Crawled — currently not indexed | **3** |
| Page with redirect | **4** |
| Redirect error | **1** |
| Excluded by noindex | **1** |
| Alternative page with proper canonical | **1** |

The 68-URL drilldown contains:
- **25 chapter URLs** (mostly locked continuation pages with no indexable prose).
- **18 genre URLs**.
- **8 story URLs**.
- **7 author URLs**.
- **4 tag URLs**.
- **6 other public static/discovery URLs**.

Every URL in that drilldown exported `Last crawled = 1970-01-01`.
That is treated as a missing/unset crawl timestamp placeholder, **not**
evidence of a crawl in 1970. 'Discovered' does not mean 'blocked', and
indexing is not guaranteed by listing pages in a sitemap. Google explicitly
notes that uncrawled pages may need stronger discoverability, content value
and/or server reliability. See its [crawling troubleshooting guide](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

### Search performance observed

Page-grouped clicks from the supplied export (last three months):

| Landing page | Clicks | Impressions | Average position |
| --- | ---: | ---: | ---: |
| `/` | 76 | 204 | 5.50 |
| `/writing-tools` | 3 | 68 | 6.21 |
| `/publish-stories` | 2 | 27 | 8.19 |
| `/wattpad-alternatives` | 1 | 39 | 37.79 |
| `/world-building-tools` | 1 | 31 | 7.32 |
| `/royal-road-alternatives` | 0 | 23 | 10.00 |
| `/webnovel-alternatives` | 0 | 16 | 18.19 |

The export's device-grouped totals show **85 clicks**, of which **58 are
mobile and 27 desktop**. The device-grouped impressions total **288**, while
the page-grouped impressions differ; do not sum them across dimensions as if
they were the same site-level metric. Google can suppress some low-volume
queries and aggregate impressions differently by grouping.

Non-branded search terms with actual reported impressions:

| Query | Impressions | Avg. position | Clicks |
| --- | ---: | ---: | ---: |
| websites like wattpad | 8 | 42.75 | 0 |
| sites like wattpad | 5 | 39.00 | 0 |
| wattpad alternatives | 4 | 32.75 | 0 |
| royal road alternatives | 7 | 15.14 | 0 |
| webnovel alternatives | 2 | 15.50 | 0 |

Also note reported `/search?q=%7Bsearch_term_string%7D` (1 click,
13 impressions). This is **not a useful search landing page**. The current
renderer explicitly noindexes internal search URLs; inspect this legacy
URL after deployment and do not add `SearchAction` solely for Google.
Google retired the sitelinks search box in November 2024; `WebSite`
site-name markup still works. [Google announcement](https://developers.google.com/search/blog/2024/10/sitelinks-search-box).

## Implemented in this PR

1. **Index quality over URL quantity.** Include only the first actually
   previewable published chapter in the chapter sitemap. Continuation chapters
   remain accessible to real readers but are marked `noindex, follow`.
   Pages with no public story prose should not consume attention ahead of
   a substantive story synopsis or author profile.
2. **Fix a canonical conflict.** `/features` has a real, different
   feature demonstration from `/`; it now gets its own canonical URL,
   social metadata and sitemap entry.
3. **Strengthen discoverability.** Comparison pages for Wattpad,
   Royal Road and Webnovel and two practical writing guides are linked
   from the site's public footer and server-rendered HTML.
4. **Give genres useful copy.** Real populated genre pages gain
   subject-specific intros, descriptions and links to represented neighboring
   genres. Pages for unrepresented genres remain unavailable instead of
   advertising imaginary works.
5. **Add two substantive writing guides.** `/how-to-write-a-web-novel` and
   `/how-to-plan-a-novel` answer actual writing workflows and link to the
   live WordWeft studio. They are **not** thin programmatic keyword variants.
6. **Fix conflicting product descriptions.** The read-online page now
   accurately distinguishes anonymous opening previews from later chapters
   requiring sign-in.
7. **Add tests** for feature canonicalization, guides, chapter-index policy,
   and mapped MongoDB chapter sitemap aggregation.

## After rollout: Search Console verification (owner action)

Priority 0, before requesting indexing:

1. Deploy backend before the frontend that consumes it. Confirm
   `READER_SIGN_IN_GATE_ENABLED=true`, `SEO_API_BASE_URL` points at the
   public backend, and Vercel is using the repository's SSR Build Output
   rather than a static `index.html` catchall.
2. Confirm real HTTP status, initial HTML, canonical, robots and visible H1
   with JavaScript disabled on `/`, `/features`, `/writing-tools`,
   `/wattpad-alternatives`, `/royal-road-alternatives`, a real genre,
   one published book and its first chapter. Verify the later chapter has
   `noindex`, a private book has 404, and an outage returns 503.
3. Verify `/sitemap.xml` is readable and child sitemaps contain only
   eligible content. Open a sample XML chapter URL and confirm it is the
   story's **first published chapter**, not a draft, locked continuation or
   duplicate.
4. In GSC's **Page indexing** report, inspect the exact URL behind the
   single **Redirect error**. The high-level CSV has no specific URL for
   that issue, so **do not guess its cause**. Inspect whether it is a loop,
   an expired host, a bad `www` redirect or another case.
5. Inspect one **Crawled — currently not indexed** URL: verify it has
   genuinely useful public text, not a duplicate thin page or a soft 404.
   Then inspect two **Discovered — currently not indexed** URLs: a real
   book and an active author. Use **URL Inspection → Test Live URL** and
   compare the initial HTML/HTTP status, selected canonical and robots.
6. Submit the existing `https://www.wordweftstudio.com/sitemap.xml`
   once after the deployment, and request indexing for a handful of
   representative, important pages—not every chapter ID. Google may
   require days or weeks to recrawl and process changes.

Priority 1, over the following 28 days:

- Compare **non-branded query** impressions/clicks separately from
  `wordweft` brand searches. Group `wattpad`, `royal road`,
  `webnovel`, `writing tools`, `publish stories`, and **individual
  published story titles**.
- Watch `/writing-tools`, the comparison pages, `/features`, the
  two guides, active genres, first chapter previews and author profiles.
  Check that pages move from *Discovered* → *Crawled* → *Indexed* where
  warranted; distinguish valid `noindex` exclusions and redirects.
- Use real, descriptive story titles and synopses; accurate genres/tags,
  content warnings and human-licensed art. Do not flood the index with
  auto-generated combinations of keywords, empty category pages or copied
  book descriptions.
- Earn contextual links through genuine author portfolios, community
  partnerships and publications; no link-buying or spam tactics.
- Watch backend cold starts, SSR 503 rates, and Core Web Vitals on mobile.
  Indexed pages must stay fast and accessible to Googlebot as well as users.

### Success measures (comparison, not guarantees)

Track the number of **meaningful public landing pages indexed** rather than
trying to index every one of the original 88 URLs. Evaluate 28-day changes
in non-brand impressions, non-brand clicks, engaged signup or reading
sessions, and story discovery from search. Expect volatile averages at
this small traffic size. No ranking, visit or indexing outcome is guaranteed.

Google's site links rely on logical navigation and relevant internal anchors:
[Google sitelinks documentation](https://developers.google.com/search/docs/appearance/sitelinks).
Schema describes visible page information but does not guarantee rich results.
General-purpose FAQ rich results are not regularly available to non-government,
non-health sites; keep the visible FAQs for readers, not for a promised
Google rich-result enhancement.
