# #169 — independent reader appearance

Before: application Light + reader Night leaves light table/disclosure surfaces under pale reader text (the regression measured heading contrast at 1.17:1). After: manuscript tables, disclosures, quotes, links and code use the reader's own ink, surface and border variables. The shared reader/preview classes apply the fix without changing the editor.

Matching live-reader screenshots use a published disposable rich-content chapter, Night, Lamp off, application Light, expanded disclosure, and the same viewport/scroll location:

| Viewport | Before | After |
| --- | --- | --- |
| 390×844 | [Before](actual-before-390.png) | [After](actual-after-390.png) |
| 1440×1000 | [Before](actual-before-1440.png) | [After](actual-after-1440.png) |

The `before` images were captured with the unchanged production stylesheet, the `after` images with this branch. Content/accounts are disposable local Spring/Mongo fixtures. Mobile is Chromium viewport emulation, not a physical iPhone/Safari check.

Portable regression (start the frontend locally first):

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- e2e/audit-169-reader-appearance.spec.ts
```

This mounts the real reader using deterministic synthetic API fixtures. It checks rendered contrast ≥4.5:1 for table text, expanded disclosure, summary, quote, emphasis, link and code in all six application/reader theme combinations; both Lamp modes with atmosphere Full/Off; a deterministic eerie mood section asserts the real detector is active for Full and none for Off; disclosure pointer and keyboard behavior; desktop/mobile widths. CSS `color()`/`color-mix()` values are converted by the browser before compositing backgrounds. Optional `AUDIT_EVIDENCE_DIR` captures matching initial Night states.

Footnote styles already use independent reader variables, so they required no change. Author inline styles, typography, artwork and layout are retained. The preview shares the same reader classes; this regression exercises the published reader, not an independent editor-preview workflow.
