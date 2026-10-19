# Community publication validation (#189)

The same empty synthetic post is submitted in the before/after images. Before, focus stays on Publish post and the blocking Circle/format errors sit above the visible dialog region. After, Circle receives focus and scrolls below the sticky header; its validation message is an accessible description. No visual redesign or draft reset is involved.

The browser regression exercises keyboard publication, missing circle/body/required title/poll options/required recommendation attachment, and successive submissions after corrections. A recovered draft whose circle no longer supports its format focuses a format control and retains its body. Each error control has an associated description, and validation exposes an alert for assistive technology. DOM accessibility assertions verify these relationships; live screen-reader audio was not tested.

`before/focus-1440.json` records the active Publish button without a description; `after/focus-*.json` records the active invalid Circle select and associated error ID. Mobile portrait is 390×844 and landscape 844×390, Chromium touch emulation. Physical iPhone/Safari was not tested.

With the disposable local frontend running:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/community-validation-focus.spec.ts
E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_MOBILE=1 npx playwright test e2e/community-validation-focus.spec.ts
E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_LANDSCAPE=1 npx playwright test e2e/community-validation-focus.spec.ts
```

Optional `AUDIT_PROOF_DIR` writes screenshots and observed focus metadata to an existing directory. Scoped API fixtures contain synthetic local accounts and circles; no production data or mutation is used.

Behavior results: [desktop baseline failure](red-desktop.txt), [portrait baseline failure](red-mobile.txt), [desktop passing](green-desktop.txt), [portrait passing](green-mobile.txt), [landscape passing](green-landscape.txt).
