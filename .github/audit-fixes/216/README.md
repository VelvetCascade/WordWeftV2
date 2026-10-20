# Custom shelf rename and deletion

Production baseline: `4055dbf32044d69afa0679a932e22b240117143a`.

Matching before/after captures show the same populated, public custom shelf selected with Shelf tools expanded. Before, only visibility and organization controls existed. After, Rename shelf and Delete shelf join the same disclosure. Desktop is 1440×1000; mobile is Chromium at 390×844. Synthetic disposable local accounts only; native iPhone/Safari was not tested.

The before captures use unchanged production frontend source. After captures and behavior checks use the fixed frontend and an isolated real Spring/Mongo runtime. The browser suite checks both populated and empty shelves, keyboard focus and cancellation, Dark appearance, visible name validation, failure/retry with the same draft, duplicate submission protection, built-in/foreign/anonymous endpoint rejection, and public profile/bulk-organize updates. Renaming a custom shelf to My List or All Books keeps its identity and management controls.

Deletion checks compare real server data: All books retains the story; a second shelf retains membership; a nonempty private passage note and 62% reading progress remain unchanged. Deleting an active shelf selects All books and focuses the selector. Browser Back cannot restore the deleted option.

The rename endpoint changes only an owned shelf's trimmed name (1–100 characters). Built-in shelves are virtual, so neither rename nor deletion finds an owned shelf document. The existing delete endpoint detaches only the deleted shelf ID from library entries; it does not remove the saved stories, progress or notes. Eight focused backend controller tests cover these contracts.

Run against a disposable local backend with `E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test e2e/shelf-lifecycle.spec.ts`. The configured browser uses a Playwright-managed browser, optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, or system Chromium where present. This suite creates and removes only its local fixture shelves and restores its private-note fixture.
