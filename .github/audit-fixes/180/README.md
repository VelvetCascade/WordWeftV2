# fix: improve profile genre and Safety badge contrast — #180

Before → after: Profile favorite-genre buttons and the Safety “Last Updated” label used gray text at 4.393:1 on the same pale gray surface. Using the existing stronger gray utility raises Light contrast to 6.867:1; Dark remains 6.757:1. Backgrounds, layout, wording and genre navigation remain unchanged.

Baseline fails 10 Light checks; fixed browser regression passes all 20 Light/Dark desktop/mobile checks, including genre default/hover/focus/pressed states, genre-route activation and the Safety label, with no scoped axe contrast violations.

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-180-contrast.mjs
```

Use the seeded disposable local backend. Optional E2E_TOKEN_FILE supplies fixture sessions; otherwise the shared helper signs into the seeded account. AUDIT_OUTPUT records screenshots and contrast JSON. PLAYWRIGHT_CHROMIUM_EXECUTABLE may override the browser; otherwise an installed system or Playwright-managed browser is used. Matching screenshots use synthetic local fixtures. Mobile is Chromium viewport/touch emulation; native Safari and physical iPhone were not tested. This is scoped contrast verification, not a complete accessibility audit.
