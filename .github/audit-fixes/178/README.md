# Author’s content note optional label — #178

Before → after: the optional qualifier used a faint gray utility (2.370:1). It now uses the existing theme-aware writer muted token (5.028:1 Light; 7.815:1 Dark). Wording, typography, layout and form behavior remain unchanged.

The browser regression measures computed foreground and composited ancestor backgrounds, with scoped axe color-contrast checks. The baseline fails four Light checks; the fix passes all Light/Dark × 1440/390 default/focused checks. It also verifies the empty-title disabled state, edits the content note, creates a private draft after entering a title and deletes that disposable draft after successful navigation.

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-178-contrast.mjs
```

Use the seeded disposable local backend. Optional `E2E_TOKEN_FILE` supplies fixture sessions; otherwise the helper signs into the seeded writer. Optional `AUDIT_OUTPUT` records screenshots and contrast JSON. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` may override the browser; otherwise an installed system or Playwright-managed browser is used. Screenshots show matching local synthetic fixture states. Mobile is Chromium touch/viewport emulation, not physical iPhone/Safari coverage. This is scoped contrast verification, not a full accessibility audit.
