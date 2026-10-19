# Quote share selection and label readability

Before → after: Quick Share / Quote Card and the five quote themes had no accessible selected state. They now expose `aria-pressed`; exactly one surface and one theme is pressed. The existing visual style and native button keyboard behavior remain in place. Inactive Light labels improve from 2.38:1 to 5.37:1; Dark labels remain above 4.5:1.

Matching captures: `before/light-390-tabs.png` → `after/light-390-tabs.png` and `before/dark-1440-tabs.png` → `after/dark-1440-tabs.png`. Identical local story, quote selection, Obsidian theme, viewport, and app appearance. Synthetic fixture data only.

`selected-states.json` records every theme choice plus Space activation of both share surfaces at 390px and 1440px in Light/Dark. The baseline has null pressed attributes; after has exactly one true value in each group. Theme changes retain focus, surface changes update the canvas, and no download is triggered. `contrast.json` measures rendered labels and records axe color-contrast checks.

Run against a seeded disposable local backend using `E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_OUTPUT=./audit-output node e2e/audit-202-selected-states.mjs`. Browser defaults to managed Playwright, with optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE` or installed Chromium fallback. Chromium emulation only; native iPhone/Safari was not tested.
