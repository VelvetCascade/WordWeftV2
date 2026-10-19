Sharing previews reuse the existing resilient cover/avatar presentation. Before → after: unavailable fixture images rendered a browser error icon with generic Cover/Avatar text; they now show the established initial-based artwork, named for the story/author. Valid artwork and canvas export loaders are unchanged.

Matching 390px screenshots use the same local story, chapter/author, failed synthetic image request, and app theme. The regression records rendered image state and exact dimensions. Failed assets are checked on book/chapter/profile dialogs in Light/Dark at 390px; missing/empty/valid/slow assets are checked on each surface at desktop width. Slow requests preserve the preview footprint before resolving to the fallback after failure.

Chromium browser checks only; native iPhone/Safari was not tested.

Run with a seeded disposable local backend: `E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_OUTPUT=./audit-output node e2e/audit-203-share-images.mjs`. `AUDIT_CASE=failed` limits a baseline run to the six matching failure screenshots. The test substitutes only fixture artwork fields in actual API responses; it never modifies backend data. It serves local synthetic SVG artwork for valid-image checks, holds delayed requests, and returns 404 for failed-image checks. An installed system Chromium or optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` can replace the default Playwright-managed browser.

Each before/after filename identifies the same surface, appearance, viewport, and failure mode. `before/images.json` records six broken `IMG` states. `after/images.json` records accessible fallback spans, valid loaded artwork, and reserved preview sizes.
