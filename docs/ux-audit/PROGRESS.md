# Implementation ledger — plan: docs/ux-audit/IMPLEMENTATION.md

Baseline: origin/production 42bf400. User approved the entire audit. All ten implementation tasks are integrated. Final evidence and limitations: [VALIDATION.md](VALIDATION.md); finding-by-finding dispositions: [COVERAGE.md](COVERAGE.md). Earlier checkpoint counts below are historical and superseded by the final results.

Pre-flight: draft recovery is shared by forms/community/editor; use user/context-scoped keys and preserve existing editor revision behavior. Genre preferences use the same field; standardize on eight without trimming existing preferences. Public visibility defaults preserve existing documents; publication review must match the server's ordered release semantics. Diagnostic data never includes content, credentials or personal information.

Task 1: complete. F01: guarded announcement/onboarding preferences, isolated optional announcements and added an outer application boundary. F55: contextual unavailable/failed story recovery. F60: bounded anonymous press/activation/navigation timing and incident IDs; physical-device validation remains pending. M01/M02/M06: short reduced-motion-safe route appearance and stable control state feedback; M04 retains the existing shared dialog focus/safe-area behavior for subsequent sheets.

Verification: production baseline 190/190 unit tests; new reliability cases failed before implementation; final 192/192 unit tests, seven focused diagnostic tests, typecheck and 8/8 browser recovery/navigation tests passed. Current mobile unavailable-story screenshot viewed at `/workspace/wordweft-quality-evidence/01-unavailable-story-mobile.png`.

Task 2: complete. F02 uses role-specific step sequences. F20 shares an eight-genre limit. F21/F22 suppress prompts during focused journeys and active dialogs/forms; feedback storage is guarded. F34 demonstrations remain under the user's control and respect reduced motion. F56 adds contextual discovery entry links; F11's dead-end menu entry now opens the personalized feed. M05 holds automatic hero cover rotation throughout a press.

Verification: reader onboarding failed before the fix and now completes; 4/4 onboarding/recovery browser tests and the real-time hero press regression pass. The hero test was corrected to populate all formats and prove rotation is active before the press; its original minimal database fixture incorrectly passed without exercising rotation. Unit suite 198/198 and typecheck pass (including independently verified draft-store groundwork for Task 3). Mobile reader onboarding captured/viewed with the actual application styles.

Tasks 3–10 are now complete; the entries below retain the implementation history.

Device limitation: physical iPhone/iOS browser reproduction and native VoiceOver remain unavailable in this environment. Implement diagnostic/interaction improvements and report this validation gap honestly.

Task 3: complete. F03/F04: user/context-scoped recoverable new-story and community forms, validated browser drafts, honest tab-only fallback, explicit discard, and cleanup after successful submission. F29: sticky dirty-profile save/cancel actions stay above mobile navigation. F53: founding application prefills account name/email, restores metadata, shows section completion, requires manuscript reselection after reload, and reviews before transmission. No manuscript files/passwords are stored. Submission analytics no longer include application email, story title, filename or failure text.

Verification: draft storage tests cover isolation, corrupt records, browser failures and cleanup; new-story/composer regressions failed before implementation and now pass. Three local browser tests cover leaving/reloading, closing/reopening and manuscript reselection. Typecheck passed. Physical browser-storage limits are reported in the UI instead of claiming server persistence.

Review follow-up (Tasks 1–3): independent review reproduced stale-account callbacks, stale-tab lifecycle overwrite, copied tab identities, manuscript retention on logout, and exit feedback over an active dialog. All received targeted fixes: scope guards, revision comparisons/shared deletion markers, document-specific conflict copies with reload recovery, owner-keyed application instances, and context/storage guards for tab-return feedback. A storage-quota recovery race was also reproduced and fixed by keeping failed writes as separate tab copies rather than masking durable revisions. Conflicts offer explicit version choice; blocked deletion reports the browser limitation. M04 adds a short opacity-only sheet appearance, preserves touch geometry/focus return, and caps dialog height to the available visual viewport.

Verification: 15 focused shared unit tests, typecheck, and 13 local browser regressions passed. Browser coverage includes real popup session-storage cloning and repeated alternate-version reloads, account switching/logout, stale cleanup, explicit version adoption, founding review/manuscript reselection, active-dialog prompt deferral, and community return context. Independent review also found publication warning-query aliasing and a restore/save race; publishing workstream is correcting these before final integration.

Task 10 community changes implemented (F49–F52): separate joined/explore circles, current/compatible joined destination or explicit choice, touch-accessible unavailable-format guidance with compatible circle choices, preserved post text/attachment context, visible publication audience, and history-aware detail Back retaining feed/filter/scroll. Browser community return and composer-format cases pass. End-to-end cross-app verification remains pending.

Integrated checkpoints: publication/edit-session contracts (2bc7eb5), consent-based public profiles/notification account isolation (b0c2ea6), readable permitted content/private passage/shelf contracts (301251d), standalone summary/tag/genre search (0594353), and discovery frontend (f53d6a4). Integrated backend test compilation passed and local runtime was rebuilt. Domain UI follow-ups and integrated full test/build/accessibility passes remain pending.

Delivery checkpoint: git fetch works; git push failed HTTP403, permission denied to connected srijibbose account. Keep cumulative patch after production42bf400 as fallback; do not include previously deployed patches.


## Final integrated checkpoint — 4 October 2026

All 60 findings and eight motion recommendations have dispositions. Physical iPhone testing (F60) remains a disclosed validation gap. Reading, library, discovery, planning, publishing, account/support and community changes are integrated, including review fixes for stale session callbacks, pending edits, private passage recovery, owner authorization and Mongo concurrency.

Final frontend: 224 unit tests, typecheck, production/SSR/17-page SEO build and 162.99 kB gzip entry budget passed. Backend: 343 tests passed, with real disposable Mongo regressions. Local API: 140 assertions / 90 requests passed. Browser inventory: 275 cases with passing evidence across the broad run, corrected targeted checks and three production-preview recovery cases; exact accounting is in VALIDATION.md. The eight broad-run failures were resolved, and five new reader-theme/viewport cases passed.

The final dialog review found no blocker. Shared caps now preserve each component's stricter responsive max-height, resize upward after keyboard/viewport recovery, and retain focus/cleanup behavior. Root inspected reading/writing evidence and kept the domain-reviewed captures; generated test screenshots now use test-results paths instead of overwriting committed documentation images.

GitHub write access remains blocked: CLI permission rejection, owner connector HTTP403 and later transport HTTP503. The authorized delivery is one cumulative patch after production42bf400, with exact-tree application verification and Drive fallback. No PR exists. Worktree/branch remain available for review.
