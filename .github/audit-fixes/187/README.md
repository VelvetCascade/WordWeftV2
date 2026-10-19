# Reader discussion profile links (#187)

Synthetic browser API fixtures in `e2e/discussion-profile-links.spec.ts` isolate the discussion UI. No real user, credential or external mutation is used.

Before: author names are spans/headings and the fallback avatar is a noninteractive image. Tab cannot reach a profile link. After: the same author names and avatars are native anchors. Ordinary pointer/touch/Enter activation uses the client router; modified clicks keep native new-tab behavior. Going Back from a drawer author reopens the discussion. Inline card author clicks do not open the thread accidentally.

`before/discussion-{1440,390}.png` and `after/discussion-{1440,390}.png` show the same chapter, discussion, comments and viewports. Visual layout is retained. `after/keyboard-*` shows the actual Tab-focused author and its measured DOM/href/focus status. Red/green logs record the behavioral assertions, including nested replies, missing-avatar fallbacks, Enter, Back, touch, native new-tab, and stable document time origin during client routing.

Reproduce with the local frontend running:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/discussion-profile-links.spec.ts
E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_MOBILE=1 npx playwright test e2e/discussion-profile-links.spec.ts
```

Optional `AUDIT_PROOF_DIR` writes screenshots and keyboard DOM observations to an existing output directory. Mobile is 390×844 Chromium touch emulation; desktop is 1440×1000. Physical iPhone/Safari and live screen-reader announcements were not tested. Native anchor semantics are asserted directly.
