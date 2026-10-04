# Whole-app quality: validation and release notes

Completed 4 October 2026. Baseline: production `42bf40007a752b3652183c9d86b692f1ca8ea7d8`; implementation branch: `feat/whole-app-quality`. The connected GitHub owner-account read confirmed this production SHA on 4 October. No production data was changed.

The user approved the original 60 findings and eight motion recommendations. [COVERAGE.md](COVERAGE.md) records every disposition; [findings.json](findings.json) preserves the original audit. F60 has implemented diagnostics and automated interaction coverage, but **physical iPhone validation remains outstanding**.

## Result and evidence

| Check | Result | Scope |
| --- | --- | --- |
| Frontend unit suite | 224 passed, zero failures/skips | Draft recovery, isolation/conflicts/quota handling, reading, publication, discovery, notification and presentation helpers |
| TypeScript | Passed | `npm run typecheck` |
| Production build | Passed | Browser bundle, SSR and 17 complete public SEO pages |
| Entry bundle budget | Passed, 162.99 kB gzip initial JavaScript | `npm run check:bundle`; the large rich-editor chunk remains loaded separately |
| Spring/Mongo tests | 343 passed, zero failures/errors/skips | Full backend suite, including real disposable Mongo concurrency and authorization tests |
| Local HTTP integration | 140 assertions across 90 requests passed, cleanup included | Real reader/writer/admin sessions, OTP mail sink, reading and writing, publication/revisions/schedules, library, community, moderation, notifications and support |
| Browser coverage | Passing evidence for all 275 discovered cases across the runs below | Chromium at phone, tablet and desktop widths; 40 spec files; local frontend and real disposable backend, with deliberate mocked failures where required |
| Production asset recovery | All three passed | Actual built app: interrupted route chunk, shared dependency, persistent failure with one automatic recovery reload maximum |
| Code review | No remaining concrete blocker reported | Access/privacy, draft/session isolation, publication concurrency, targeted activity writes and shared dialog sizing |

### Browser execution accounting

This is **not a claim that a single 275-case run passed**. The broad run contained 270 tests: 259 passed, eight failed, and three production-only tests skipped. The failures were investigated and corrected; follow-up runs covered the changed behavior and added five cases. The three skipped production tests then passed separately against the built preview.

The 17-case correction run passed 16, with only the hero clock fixture failing. The next ten-case opened-dialog run passed nine; the hero case completed its assertions but its artifact cleanup collided with a simultaneous preview test using the same output directory. Its final isolated, real-time run passed. Production preview passed three of three. All eight original failures therefore have passing correction evidence, alongside four extra reader-theme combinations and a viewport shrink/grow regression. There are 272 development cases plus three production-preview cases in the final test inventory.

| Original failure | Diagnosis and correction | Final evidence |
| --- | --- | --- |
| Community follower connection assertion | Old plural selector did not match the corrected singular label. | Poll/comment/follow/saved-post/connection journey passed. |
| Automatic hero word/covers | Old seven-second expectation, seeded covers pointing to an unavailable local asset server, and a frozen test clock interfering with lazy-route/render effects. No product interval change. | Real-time stories → novels → poems → stories, matching published links/covers and stable highlight geometry passed. |
| Global autocomplete | The field now has the correct `searchbox` semantics; assertion still expected `combobox`. | Keyboard shortcut, autocomplete, Escape and focus return passed. |
| Reader dark-theme accessibility | Discussion surfaces inherited global-theme colors and a primary label lacked sufficient contrast. | Page and opened passage drawer passed Axe in all six global/reader theme combinations. |
| Compact library resume | The spec reused one fixed IP across many tests and exhausted the real reading-progress rate limit. Production limits were retained; the local fixture uses isolated test IPs. | Compact resume opened the actual next unread chapter. |
| Touch discussion | Old drawer names no longer matched the current Story discussions / Passage labels. The trace showed the drawer had opened after one tap. | Reading/discussion/focus and writer-comment navigation passed using touch emulation. |
| Notification bounds at tablet/desktop | A shared attribute selector overrode each component's stricter height cap. | 320/390/768/1440px bounds and opener focus passed. Open-sheet shrink/grow preserved the component cap. |

After the shared dialog fix, nine additional checks passed for opened character/scene/note forms, light/dark phone fields, writer inbox/reply context, pending/private passage saves and story-dialog focus. The final frontend unit/type/build checks all ran after the source fix. The full backend run covers the final backend sources; subsequent fixes only changed frontend code/tests/docs.

## Changes by journey

- **Application reliability:** optional announcements/storage failures are isolated; recovery retains navigation and offers contextual actions. Anonymous incident references and bounded press/activation/route timing support investigation without recording manuscript text, credentials, account IDs or element labels. Late responses from an expired account session cannot restore or change the new session.
- **First visit and discovery:** onboarding follows reader/writer/both intent; genre selection shares the eight-choice limit. Prompts defer during active reading, writing, forms and dialogs. Available genre shortcuts, compact catalog/Hook Feed layouts, useful filter summaries and honest search scope/recovery preserve browsing context. Hero covers remain real story links, rotate automatically with the highlighted word, and pause through a press.
- **Reading:** permitted prose is readable in the DOM; guest previews are truncated on the server and locked chapters remain protected. Discussion scopes/counts agree; direct links reach the intended passage. Private passage bookmarks/notes support text finding and verified quote recovery. Newer text typed during a pending save is retained. Character details have explicit visibility and spoiler controls. Endings distinguish completed stories from ongoing stories caught up; optional quiet controls retain reliable reveal and keyboard access.
- **Library:** inline private-default shelves, visibility explanations, search/sort and selected-book organization preserve the surrounding story. Owner-only deletion retains the story and other memberships. Compact resume leads on mobile; cards show new releases and the actual next unread chapter. Mutations update the affected section instead of replacing the whole page.
- **Writing and publication:** new-story metadata and planning/reply drafts recover per account/context. Character, scene and private-note forms support labeled editing and deliberate cancel. The manuscript remains mounted while using guide tools. Writer inbox filters retain passage and reply context; read/view/completion labels agree with their data. Release review lists every affected earlier chapter, warnings, schedules and private-story visibility. Server revision checks reject stale writes/reviews/restores. Failed saves offer retry, a verified device-copy exit, export/copy or explicit discard. Preview supports real reader themes and phone/desktop widths.
- **Account and community:** reader identity and intentionally public shelves replace empty writer-first profiles; public reading statistics require opt-in. Author ratings exclude unrated stories and use review weighting. Dirty settings have persistent actions. Notifications group activity and update optimistically with rollback and account isolation. Password reset explains the inbox step; support covers actual loading/progress/tap/upload failures with optional incident references. Joined circles differ from exploration; composer formats/destinations explain requirements and preserve text; detail Back returns to the originating feed.
- **Interaction polish:** short opacity-only route/sheet appearance, stable pressed states, reduced-motion support, local pending/success/error feedback, opener focus return and viewport-aware dialog caps. Active touch targets do not translate under the user's finger. Intentional reader/writer palettes and readable prose widths remain.

## Persistent data and deployment

Deploy the matching frontend and backend together. The frontend uses new passage/planning/publication and privacy contracts; deploying only the frontend cannot provide those server behaviors. Existing documents require no bulk rewrite.

Persistent additions are additive: `User.publicReadingStats` (default false), character visibility/spoiler fields, revision warning/disclaimer metadata, and the private `passageBookmarks` collection. Its owner/book indexes are `private_passages_by_book` and `private_passages_latest_by_book` (the latter adds descending `updatedAt`). Existing Spring automatic index creation is retained; the old index name is not repurposed. No destructive migration or production index operation was performed during testing.

Rollback can leave these additive fields, collection and indexes in MongoDB; older code can ignore them. **Older code will not enforce or present the new privacy, visibility and concurrent-edit behavior.** Reverting application binaries therefore restores the old application's semantics, not the stronger guarantees of this release. Keep the ordinary deployment/database backup process and review privacy expectations when reverting. Do not delete passage data as part of a routine rollback.

Activity counters use targeted atomic updates so reads/comments/reviews cannot replace a newer manuscript snapshot. Import appends use an owner-filtered atomic operation and do not resurrect a removed story. Real-Mongo regression tests cover the relevant races. Compatibility paths remain for existing clients omitting optional revision/review inputs; the new UI uses the stronger checked paths.

## Validation limits

- Physical iPhone Safari/Chrome, native VoiceOver, translation and read-aloud were unavailable. Chromium touch/viewport/Axe checks establish automated behavior only; they do not prove the reported random native tap failures or all production crashes are resolved. The release includes privacy-safe evidence collection and contextual recovery for further investigation.
- Production Atlas search, R2 uploads and real SMTP delivery were not exercised. The local Mongo fallback search, upload-unavailable behavior, parser flows, authorization and local OTP/reset mail sink were tested. No production credentials or data were used.
- Axe and readable DOM checks support accessibility but do not replace native assistive-technology review. Visual evidence was inspected for the changed reading/writing forms and small viewports; no claim of exhaustive hardware coverage is made.
- Vite still warns about the size of the existing rich-editor chunk. The initial-entry budget passes; editor bundling was not changed merely to silence that warning.

## Delivery

The local branch is committed. GitHub CLI push was rejected for the connected account; owner-account connector branch creation was also rejected with HTTP403, “Resource not accessible by integration.” A subsequent CLI attempt encountered HTTP503 transport failure. No remote branch or PR was created.

The authorized Drive fallback is one cumulative change after production `42bf400`, not a sequence of earlier patches. The release package includes an IntelliJ source patch, the eleven documentation screenshots at their original relative paths, an optional complete Git binary patch, application instructions and a ready PR description. The package application is verified against the production Git tree before delivery. Keep the local worktree for review and iteration.

Execution logs are retained in the workspace: `/tmp/wordweft-final-e2e.log`, `/tmp/wordweft-final-backend.log`, and `/tmp/wordweft-release-{unit,type,build,bundle,api,assets,dialogs,hero-final}.log`. These logs are local evidence, not production telemetry.
