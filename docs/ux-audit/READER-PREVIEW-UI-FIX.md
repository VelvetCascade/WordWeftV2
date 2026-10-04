# Reader preview and inline note UI correction

4 October 2026. UI-only follow-up to production `f642091`, based on the separately delivered history crash fix `92a9e78`. Deploy the frontend after applying the history fix and this incremental UI patch. No backend, API contract, database document, MongoDB index or migration changes are included.

## What caused the screenshot's poor layout

The editor preview mounted legacy reader classes instead of the current `reader-v2` surface. Its simulated phone title rendered at 58.2px, while the actual phone reader used 37px. Legacy margins, colors and a large drop cap made the canvas look different from the live reading experience. Its viewport/theme controls and absolutely positioned Close button competed in one row.

## Corrected experience

- Load the shared reader skin directly in the editor, so it works on a first visit without first opening a chapter. Match the live reader's fonts, selected paper colors, title alignment and reading rhythm. The selected light/sepia/dark paper remains independent of the studio theme.
- Use a clear preview heading, two labeled 44px controls and a 44px Close button. The toolbar wraps into two rows on phones. Phone simulation stays 390px wide when space permits; the surrounding desktop dialog narrows to 640px rather than leaving wide blank sides. Desktop preview uses the larger canvas. Narrow devices and landscape heights keep the controls accessible above the scrollable chapter.
- Show chapter number, estimated reading time and word count. Preserve paragraph alignment, mood/disclosure formatting, spoilers, character interactions and the writer's selection on return. Match the live reader's paragraph wrappers, including spacing inside mood and disclosure blocks. No manuscript content is rewritten.
- Keep notes within their reading surface using the existing Floating UI dependency. Prefer positioning below the marker, flip/shift when necessary, and let long notes scroll with a reachable sticky close control. Notes follow the selected reading palette and remain above following paragraphs and their own paragraph actions.
- Replace the invisible full-screen note dismiss layer with outside-pointer/focus dismissal. A tap on another control can close the note and activate that control. Native note buttons expose expanded state. Escape closes a note before its preview, while a newer reader dialog retains its own Escape/focus behavior. Plaintext notes keep normal fonts under the legacy cipher typography scope.
- Keep long book titles from overlapping reader-header controls on narrow screens; use 44px header actions.
- Separate mobile paragraph actions from inline prose with a small annotation gutter and full 44px actions. Remove the old inset override and revealed-paragraph padding shift that let a comment button intercept a right-aligned note's repeat tap. Table-cell actions use a contained footer instead of moving into a neighboring cell.

## Reproductions and review

Before correcting the preview, its title size comparison with the real phone reader failed (58.2px versus 37px); a right-edge note extended 85.4px beyond its canvas. Actual-reader checks reproduced a following paragraph covering a note and a comment action intercepting a repeat note tap. A separate reviewer found and verified the paragraph-wrapper, stacking, modal-focus and table-cell cases. Each was corrected before delivery.

The accessibility check waits for the note's short entrance animation to finish before measuring its final contrast. The chapter-manager integration test now waits for asynchronous publication to complete before reading its saved status; it previously raced that request under parallel browser load.

## Validation

230 frontend unit tests, 17 distinct Chromium publishing/editor/reader cases, 10 WebKit cases, 22 SEO tests, typechecking and the production/SSR/SEO build passed. The 17-case Chromium batch passed 16 cases; its note-contrast case passed three focused runs after waiting for its entrance animation. Final reader/header/table checks passed in both engines after the last layout correction. One WebKit rerun timed out while still displaying the loading shell, before its table assertions; the subsequent focused 320px and 390px table runs both passed. No cause for that isolated timeout was established. The entry JavaScript budget passed at 163.35 kB gzip.

Results and commands are recorded in the delivery's `verification.json` and browser logs. Browser cases cover real local Spring/Mongo publication and editing journeys, plus viewport geometry, interaction hit-testing and accessibility. The runtime uses disposable development accounts and data. No production data was changed.

Desktop screenshots use 1440×1000; touch layouts include 390×844, 320×568 and 844×390. Table actions were also independently reviewed at 720px and 1440px. Chromium and Linux Playwright WebKit do not establish native physical-iPhone or VoiceOver behavior. The original broad quality/audit release and the history-rate correction remain separate from this UI-only patch.
