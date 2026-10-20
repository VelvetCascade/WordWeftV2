# Issue 213 verification

Before → after: Post actions stayed open after Escape or an outside click/tap. The menu now closes on Escape and returns focus to its trigger, closes on outside pointers without swallowing the adjacent action, and closes when keyboard focus leaves. Native buttons and links retain normal Tab traversal and the existing placement.

At 1440px and 390px, the baseline records afterEscape=true and afterOutside=true; the focused regression fails because the menu remains mounted. The fix records both false and exactly one adjacent Share click. Browser assertions check collapsed trigger state, Escape focus return, Tab/Shift+Tab departure, the report sign-in guard and Open discussion navigation. A real local admin-owned post retains edit/delete/pin/lock/remove dialogs; cancellation sends no post mutation, and the owner has no report action.

Screenshots use a deterministic schema-shaped synthetic community feed. Action-dialog checks use an actual disposable local admin-owned post, deleted during cleanup. Mobile is Chromium touch/viewport emulation; physical iPhone and native Safari were not tested.

Reproduce with a disposable local backend: `E2E_BASE_URL=http://127.0.0.1:3033 node e2e/audit-213-post-menu.mjs`. Set `AUDIT_OUTPUT` for screenshots and JSON measurements. Use `AUDIT_BASELINE=1` to capture original behavior without fixed-state assertions.
