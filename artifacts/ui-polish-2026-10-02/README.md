# UI refinement evidence — 2026-10-02

The application was reviewed across 44 routes and 191 distinct route/viewport combinations at 320, 390, 768, 1024, 1440, 1920 and 2560 CSS pixels. All 90 browser checks passed against the real local backend. The captured fixture states have no document overflow, page exceptions, broken loaded images or visible error alerts.

`before/` records the first redesign checkpoint, except `studio-capped-1920.png`, which records an intermediate 1320 px frame before the user's request to use the full screen. It is retained to explain that specific correction.

`after/` contains 20 selected final route and interaction views. `reports/route-measurements.json` contains the latest measurements for every reviewed route/viewport; `reports/summary.json` gives aggregate results; `reports/verification.txt` records validation and provider limits. Earlier source-to-implementation comparisons remain in `../redesign-v2/`.

| Change | Before | After |
| --- | --- | --- |
| Wide writer workspace | [Capped frame](before/studio-capped-1920.png) | [Adaptive studio](after/studio-1920.png) |
| Mobile search cover and title | [Narrow text](before/search-390.png) | [Readable results](after/search-390.png) |
| Notification preview | [Clipped overlay](before/notifications-preview-390.png) | [Contained sheet](after/notifications-preview-390.png) |
| Writer guide context | [Chapter controls on guide tab](before/characters-390.png) | [Character guide](after/characters-390.png) |
| Reading on wide screens | — | [Chapter rail, prose and discussion](after/reader-1920.png) |
| Writing on wide screens | — | [Editor at 2560 px](after/editor-2560.png) |
| Account editing | — | [Live public preview](after/settings-1920.png) |
| Analytics | — | [All statistic columns and story names](after/analytics-1920.png) |
| Small-phone circle | — | [Intact title and bounded art](after/circle-320.png) |

Screenshots use Chromium with loaded fonts and density 1. Wider views have a 1000 px viewport height; mobile views use 844 px. Most route images capture the full document; the focused editor has its own scrolling manuscript. Fixed mobile navigation appears at the original viewport bottom within a tall full-document capture. Fixture titles, counts and membership can vary after interactive checks.
