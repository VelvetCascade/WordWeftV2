# Writer chart axis contrast — #179

Before → after: 11px axis values used a fixed pale foreground and measured 3.192:1 on the Light chart. They now use the existing theme-aware writer muted token (5.387:1 Light; 6.759:1 Dark, previously 4.532:1). Chart data, scale, spacing, typography and animation remain unchanged.

The baseline browser regression fails on the four actual/filtered Light checks. The final regression passes all actual, filtered, empty, low and high data checks in Light/Dark at 1440×1000 and 390×844. It measures computed foreground/composited backgrounds and scoped axe, including aria-hidden visible axis labels. It checks that axis label rectangles do not intersect bars or each other.

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-179-contrast.mjs
```

Use the seeded disposable local backend. Optional E2E_TOKEN_FILE supplies fixture sessions; otherwise the shared helper signs into the seeded writer. AUDIT_OUTPUT records screenshots and contrast JSON. PLAYWRIGHT_CHROMIUM_EXECUTABLE may override the browser; otherwise an installed system or Playwright-managed browser is used. The matching before/after screenshots use synthetic local fixture data; the final JSON additionally records the expanded scenario matrix. Mobile is Chromium touch/viewport emulation, not physical iPhone or native Safari testing. Scoped contrast checks do not constitute a full accessibility audit.
