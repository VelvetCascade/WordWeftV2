# Review-success prompt ownership — #215

Synthetic scoped browser API fixtures only. No production reviews or accounts were changed.

Reproduce against this branch with the repository Playwright configuration:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/review-dialog-notice.spec.ts
AUDIT_MOBILE=1 E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/review-dialog-notice.spec.ts
AUDIT_LANDSCAPE=1 AUDIT_DARK=1 E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/review-dialog-notice.spec.ts
```

`before/edit-1440.png` and `before/edit-390.png` show production 4055dbf with the same recently saved/reopened review as their `after/` counterparts. The baseline regression fails because the old prompt remains visible after opening the new dialog (red.txt). The fixed regression checks the Update button hit target, a real click or emulated touch update, dismissal when opening delete/share dialogs, and keyboard focus remaining inside review/delete/share dialogs. It also checks the suggestion's accessible close name and scoped axe text contrast in Light and Dark.

Short landscape uses 844×390, Dark appearance and reduced motion. `after/edit-844.png` and `after/suggestion-844.png` show that extra case. Mobile touch is Chromium emulation; native iPhone/Safari was not tested.
