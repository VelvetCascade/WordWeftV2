# WordWeft whole-app quality implementation

**Approved scope:** the 60 findings and eight motion recommendations in the 3 October 2026 audit, accepted by the user with “Sure do all of these.” The audit is the design brief; preserve the existing premium visual system and every existing feature.

**Baseline:** latest fetched `origin/production`, `42bf400`. Its tree matches audited `f0d9617`. Work in `/workspace/WordWeftV2-quality`, branch `feat/whole-app-quality`.

**Architecture:** use small shared helpers for safe optional storage, recoverable user-scoped form drafts, presentation and reading utilities. Integrate those helpers into existing journeys rather than replace routing, editors or services. New persistent capabilities use additive fields/endpoints and preserve compatibility with existing documents and callers.

**Stack:** React 19, TypeScript, Vite, existing component/CSS system, Spring Boot and MongoDB. Native execution in this session with a persistent progress ledger. Regression tests before behavior fixes; browser verification for visual changes.

**Final status:** all implementation tasks integrated and automated checks completed. Physical-device/native assistive-technology verification remains unavailable; GitHub write access blocked PR creation. The requested cumulative Drive fallback is used. See [VALIDATION.md](VALIDATION.md) for precise outcomes and limitations.

## Global constraints

- No feature removal, production data mutation, destructive migration or automatic publication.
- Preserve intentional reader/writer palettes, typography, centered prose and full application layout.
- Local pending/success/error states; keep active controls mounted, preserve context and roll back failed optimistic updates.
- Respect reduced motion, keyboard/focus, mobile safe areas and keyboard clearance.
- Preserve drafts before navigation; user-owned recovery only; never claim device-only work is saved online.
- Never collect manuscript text, passwords, tokens or personal data in reliability diagnostics.
- Real iPhone failures and native assistive technology require honest validation limits, not a claim based on Chromium.
- Every audit finding receives a recorded implementation disposition and verification evidence.

## Review focus

1. Blocked/full browser storage must not take down the application or silently lose manuscript/form text.
2. Late requests, back/forward restoration and overlays must not replace the user's current task or swallow the first interaction.
3. User switching and multiple tabs must not disclose another user's drafts or silently overwrite newer work.
4. Publishing a later chapter must disclose or reject implicit publication of earlier chapters; existing clients remain compatible.
5. Accessible prose, opened forms and keyboard-sized mobile sheets must preserve visible reading and touch usability.

## Task 1: Shared reliability and recovery

**Coverage:** F01, F55, F60; M01, M02, M04, M06.
**Files:** `utils/optionalStorage.ts`, new `utils/reliabilityDiagnostics.ts`, `components/WhatsNewPopup.tsx`, `components/RouteSurface.tsx`, `App.tsx`, `pages/BookDetailsPage.tsx`, shared CSS; unit/E2E reliability tests.
**Interfaces:** safe optional preference read/write/remove, bounded diagnostic incident capture and export without content, outer/optional error boundaries, contextual unavailable-content surface.
- [x] Reproduce unavailable announcement storage and assert the core app remains reachable; cover read/write failures and repeat navigation.
- [x] Implement optional storage isolation, global recovery and privacy-safe incident context; keep navigation and click targets stable.
- [x] Verify missing/private/temporary story recovery and shared transitions on mobile/desktop, reduced motion and keyboard.
- [x] Run focused regression and full unit suite; commit and record results.

## Task 2: Role-aware onboarding and calm discovery prompts

**Coverage:** F02, F20, F21, F22, F34, F56; M05.
**Files:** `components/WelcomeJourney.tsx`, `components/WhatsNewPopup.tsx`, `components/Navbar.tsx`, `components/FeedbackBanner.tsx`, `hooks/useFeedbackTriggers.ts`, preference utilities, `pages/EditProfilePage.tsx`, `pages/HookFeedPage.tsx`; matching backend preference limit if needed.
**Interfaces:** explicit role step sequences, single favorite-genre limit of eight, safe role preference, prompt suppression for active reading/writing/dialogs.
- [x] Test reader/writer/both/Skip/Back sequences and existing six-to-eight genre preferences.
- [x] Implement correct role navigation, controlled/reduced-motion demos and role/context-aware prompts.
- [x] Surface discovery destinations in their relevant navigation areas.
- [x] Verify with real local accounts and full unit suite; commit and ledger.

## Task 3: Recoverable forms and settings

**Coverage:** F03, F04, F29, F53.
**Files:** new draft utility/hook, `pages/CreateBookPage.tsx`, `components/community/CommunityComposer.tsx`, `pages/EditProfilePage.tsx`, `pages/FoundingWritersPage.tsx`.
**Interfaces:** versioned user/context-scoped draft keys, guarded recovery with tab fallback, explicit restore/discard, dirty-state save bar; files retain live state and explain reselection after reload.
- [x] Test navigation/close/reopen, successful-submit cleanup, logout/user switching, unavailable storage and explicit discard.
- [x] Implement shared recovery and integrate each form; preserve existing profile/policy handoff behavior.
- [x] Verify mobile keyboard, long-form progress and action placement; full unit suite, commit and ledger.

## Task 4: Accessible reading, discussions and passage tools

**Coverage:** F05, F06, F12, F46, F47, F48; M07, M08.
**Files:** `pages/ReaderPage.tsx`, `pages/BookDetailsPage.tsx`, `components/CharacterPreview.tsx`, cast management, reading helpers; chapter content service/DTO and reader tests where required.
**Interfaces:** correct discussion scopes/counts, readable permitted prose, exact passage anchors/bookmarks and private notes, spoiler-aware public character details, reader appearance/quiet controls.
- [x] Test All/Chapter/Passage counts, preview access boundaries, exact-place recovery and completed/ongoing ending actions.
- [x] Implement readable accessibility path without exposing locked content; add passage utilities and explicit character visibility.
- [x] Improve mobile story entry and optional quiet controls; preserve progress/auth return and writer-only information.
- [x] Validate keyboard, DOM accessibility, mobile layout and reader regressions; commit and ledger.

## Task 5: Deliberate publication and safe editor sessions

**Coverage:** F07, F10, F39, F40, F41, F42, F43.
**Files:** `pages/ChapterEditorPage.tsx`, publishing/recovery helpers, `components/ScheduleChapterDialog.tsx`, book controller/publication/revision services and tests.
**Interfaces:** complete release-impact review, common publication status, explicit failed-save exits, concurrent-edit detection, viewport/theme preview, schedule cancellation.
- [x] Test later chapter release with preceding drafts/schedules, private-story visibility, failed save and concurrent sessions.
- [x] Show every affected chapter before publishing; reject stale release/editor operations safely and preserve both drafts.
- [x] Implement clear warning/status/schedule controls and actual reading-condition previews.
- [x] Run backend publication/controller tests, editor journeys and full frontend suite; commit and ledger.

## Task 6: Complete planning and writer inbox tools

**Coverage:** F08, F35, F36, F37, F38, F44, F45.
**Files:** `components/CharacterList.tsx`, `components/SceneList.tsx`, `components/NoteList.tsx`, `components/WorldBuildingSidebar.tsx`, `pages/CreateBookPage.tsx`, `pages/ManageChaptersPage.tsx`, writer comments/analytics and planning controllers/services.
**Interfaces:** authenticated note/scene update endpoints, labeled forms, planning return context, inbox filters and preserved reply drafts, shared read/view terminology.
- [x] Test edit authorization and saved scene/note changes; label opened inputs and imports.
- [x] Add editing and context-preserving guide actions; correct new-story mobile order.
- [x] Add passage-aware inbox filters and coherent metric definitions.
- [x] Verify opened forms with Axe and author workflows, backend tests and full frontend suite; commit and ledger.

## Task 7: Useful and compact discovery

**Coverage:** F11, F13, F15, F16, F17, F18, F19.
**Files:** `App.tsx`, `pages/CategoryPage.tsx`, `pages/HookFeedPage.tsx`, `components/SearchOverlay.tsx`, `pages/SearchResultsPage.tsx`, catalog/search helpers and backend search if necessary.
**Interfaces:** available ranked shortcuts, searchable taxonomy, applied filter summary, honest search scope/suggestions and preserved query/return position.
- [x] Test nonempty shortcuts, filters, search submit/return/no-results and personalized destination.
- [x] Implement compact browse and hook layouts, coherent genre selection and mobile close controls.
- [x] Improve weak-match recovery with supported search fields, without misleading fabricated matches.
- [x] Verify desktop/mobile and full suite; commit and ledger.

## Task 8: Contextual library organization

**Coverage:** F14, F23, F24, F25, F26; M03.
**Files:** `pages/LibraryPage.tsx`, `pages/BookDetailsPage.tsx`, shelf components/helpers, library APIs/services.
**Interfaces:** inline private-default shelf creation, shelf search/sort and selected-book organization, next-unread/new-release presentation, section-only mutation feedback.
- [x] Test inline creation/save, privacy, failed mutations, next unread and new chapter badges.
- [x] Implement compact resume, lightweight organization and explicit visibility, preserving filters/scroll.
- [x] Verify no whole-page replacement on shelf changes, mobile sheets and backend/API behavior; full suite, commit and ledger.

## Task 9: Reader identity, coherent settings and support

**Coverage:** F09, F27, F28, F30, F31, F32, F33, F54, F57, F58, F59.
**Files:** profile/author/settings/notification/auth/contact/feedback/policy pages, shared presentation utilities and privacy fields in user model/DTO/service.
**Interfaces:** rated-only/review-weighted author average, intent-appropriate profile, additive public-reading visibility control, grouped actionable activity, shared pluralization and control conventions.
- [x] Test unrated averages and public/private profile responses, notification destination/grouping and auth return.
- [x] Implement reader-oriented profile and public preview, coherent appearance/preferences, password-request confirmation and preview-account benefits.
- [x] Add incident-aware help and improve contrast/plurals/shared actions without altering intentional palettes.
- [x] Verify desktop/mobile/light/dark, accessibility and backend privacy tests; full suite, commit and ledger.

## Task 10: Community continuity and final verification

**Coverage:** F49, F50, F51, F52; final cross-app verification including F60.
**Files:** `pages/CommunityPage.tsx`, `pages/CommunityPostPage.tsx`, `components/community/CommunityComposer.tsx`, community navigation helpers/tests; audit progress and release notes.
**Interfaces:** truthful joined-circle list, explicit allowed destination/type choices, originating-feed return and preserved composer drafts from Task 3.
- [x] Test joined/unjoined circles, destination changes, unavailable post types and feed/filter return.
- [x] Implement contextual posting and return behavior without relaxing server permissions.
- [x] Run frontend unit/type/build/bundle checks, backend suite, API checks, browser journeys, opened-form accessibility and final code review.
- [x] Record each F01–F60/M01–M08 outcome; disclose physical-device/native-tool validation still unavailable.
- [x] Commit, push the implementation branch and raise a reviewable PR when repository access permits; provide a verified Drive fallback if transport is unavailable.
