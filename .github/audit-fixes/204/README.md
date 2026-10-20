# Balanced mobile book and chapter sharing

Before → after: the four book/chapter channels formed rows of three and one at 320px and 390px. A rule scoped to `.ww-share-dialog` now gives them a balanced 2×2 grid within the existing mobile breakpoint. Desktop remains four columns. The separate author dialog keeps three-plus-two mobile and five columns desktop, including Instagram's portfolio-card action.

Matching screenshots use the same synthetic fixture, viewport, theme, and bundled story artwork. Pairs cover book at 320px, chapter at 390px, author at 390px, and desktop book sharing at 1440px. `grid.json` records row counts, computed columns, label fit, touch-target geometry, keyboard order, and the four share destinations before/after. No external share is sent: the browser records the `window.open` boundary and validates each URL against the actual public link.

The regression checks all three surfaces at 320px Light, 390px Light/Dark, and 1440px Light. Buttons remain at least 48×48px, labels fit, keyboard Tab/Space follows the displayed order, all four destination links remain correct, and author Instagram still opens the card canvas.

Run against the seeded disposable local backend with `E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_OUTPUT=./audit-output node e2e/audit-204-share-grid.mjs`. The test serves the bundled story artwork for its canonical fixture URL regardless of local test port. It defaults to Playwright's managed Chromium, with installed Chromium or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` fallback. Native iPhone/Safari was not tested.
