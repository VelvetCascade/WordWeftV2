# Search text contrast — #177

The local production source regression failed on numeric ratings (2.058:1) and highlighted author metadata (4.202:1), then checks the actual computed foreground/background contrast and scoped axe color-contrast results after the fix. Screenshots use disposable synthetic story/account fixtures. A search response retains the seeded content and supplies a 4.7 rating so the test always exercises a numeric label; a zero-rating response separately verifies that no rating label appears.

Run against the disposable seeded local backend/frontend:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 node e2e/audit-177-contrast.mjs
```

Optional `E2E_TOKEN_FILE` supplies local fixture sessions; otherwise the script logs in to the existing seeded local writer account. Optional `AUDIT_OUTPUT` records screenshots and computed contrast/axe JSON. The regression covers Light/Dark at 1440×1000 and 390×844, ordinary, keyboard selected and hovered suggestions, and zero ratings. Both normal text targets must meet 4.5:1. The gold stars remain decorative.

This is scoped contrast verification, not a complete WCAG audit. Mobile coverage uses Chromium viewport/touch emulation, not native Safari or a physical iPhone.

Validation: the browser regression exits 1 on the baseline and 0 after the fix. Light numeric rating 2.058 → 7.655:1; selected metadata minimum 4.202 → 6.945:1. Dark minimum across targets 7.357:1. No scoped axe color-contrast violations after the fix. `npm test`: 320 passed; `npm run typecheck` and `npm run build`: passed.
