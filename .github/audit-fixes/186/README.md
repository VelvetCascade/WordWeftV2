# Comment draft ownership (#186)

Before: a pending reader/community comment or reply accepted unsent edits, then the earlier success could clear them. After: its composer is read-only until completion; reply cancellation/toggling is disabled. Failure retains the submitted text, announces the local error and restores editing for retry.

Paired `before-390-pending.png` → `after-390-pending.png` and `before-1440-pending.png` → `after-1440-pending.png` show the same story, viewport and keyboard action. Both send “Synthetic submitted thought”, then attempt Select All and type “New unsent thought”. Before, the textarea changes; after, it keeps the submitted text. `keyboard-proof.json` records the matching request payload, draft and read-only property without credentials.

The before runtime uses unchanged production ReaderPage.tsx; after uses this branch. Existing community/reader pending and failure screenshots show desktop/mobile recovery. All accounts/content are disposable local fixtures. Chromium mobile touch emulation was tested; native iPhone/Safari was not.

Regression: `E2E_BASE_URL=http://127.0.0.1:3025 npx playwright test e2e/comment-draft-ownership.spec.ts e2e/reader-async-actions.spec.ts --grep 'pending reader|community pending'`. Use the disposable local backend accounts from its fixture seeder. Tests cover keyboard edits, disabled submit/cancel/toggle, delayed failure, retained draft and one successful retry for reader/community roots and replies. Reader chapter and passage discussions share the tested composer. `red.txt` records pre-fix editable composer failure.

This branch changes pending composer ownership only. Shared-file overlap: other audit fixes may edit ReaderPage.tsx and CommunityComments.tsx.
