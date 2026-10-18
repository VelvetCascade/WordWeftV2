# #170 — native disclosure keyboard traversal

Before: the shared focus trap omitted native summaries and counted closed disclosure descendants as available controls. The Publication changes disclosure could be skipped or the trap could fail to wrap at the actual final control. After: discovery follows native sequential focus order, includes the first native summary, and excludes disabled/hidden/inert/negative-tabindex controls and closed disclosure contents. The positive/ordinary tabindex boundary stays inside the dialog even when the page has other controls.

| Viewport | Before | After |
| --- | --- | --- |
| 1440×1000 | [Before](before-1440.png) · [focus trace](before-1440-keyboard.json) | [After](after-1440.png) · [focus trace](after-1440-keyboard.json) |
| 390×844 | [Before](before-390.png) · [focus trace](before-390-keyboard.json) | [After](after-390.png) · [focus trace](after-390-keyboard.json) |

The fixture mounts the production ChapterVersionHistoryDialog and shared useDialog hook with disposable revision API responses. It does not reproduce the whole authenticated editor route. No restore/withdraw request is submitted. Screenshots alone do not establish keyboard traversal; the portable regression performs real Tab, Shift+Tab, Enter, Space and Escape presses and checks actual focus.

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- e2e/audit-170-dialog-focus.spec.ts
```

It checks closed/open disclosure traversal and wrapping in both directions at desktop/mobile widths; the shared native-control fixture also checks positive tabindex order, disabled fieldsets, hidden/inert controls, nested dialog ownership, scroll lock and focus return. Mobile is Chromium viewport emulation; physical devices/native Safari remain unverified.
