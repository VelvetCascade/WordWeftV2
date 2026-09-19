# Holistic Flow Repair Implementation Plan

> Execute this plan test-first. Keep ImageKit for covers, avatars, and character portraits; use Cloudflare R2 only for inline chapter images and Founding Writer manuscripts.

**Goal:** Make import, authentication, publication, discovery, search, and reading flows consistent, failure-safe, and responsive across mobile and desktop.

**Architecture:** Introduce stable API error codes, a chapter published snapshot, and one publication workflow service. Migrate every public content consumer to the snapshot. Then simplify the affected React surfaces around explicit states and responsive interaction patterns.

**Stack:** Spring Boot 3.2, MongoDB, React 19, TypeScript, Vite, Tailwind/CSS, Node test runner.

---

## Task 1: Establish stable authentication/error semantics

**Files:**
- Modify: `backend/src/main/java/com/wordweft/security/jwt/AuthEntryPointJwt.java`
- Modify: `backend/src/main/java/com/wordweft/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/wordweft/config/SecurityConfig.java`
- Modify: `api/client.ts`
- Test: `backend/src/test/java/com/wordweft/book/controller/ChapterContentControllerTest.java`
- Test: `tests/authSession.test.ts`
- Test: `tests/readerAccess.test.ts`

1. Add failing tests proving `AUTH_REQUIRED` does not clear auth and invalid JWT returns `SESSION_INVALID` JSON.
2. Emit structured JSON from the authentication entry point and permit `/error`.
3. Parse the response body before invalidating a client session; only invalidate for `SESSION_INVALID`.
4. Run focused backend and frontend tests.

## Task 2: Make imports complete or explicitly fail

**Files:**
- Modify: `backend/src/main/resources/application.properties`
- Modify: `backend/src/main/java/com/wordweft/manuscript/service/ManuscriptParser.java`
- Modify: `backend/src/main/java/com/wordweft/manuscript/service/ManuscriptImportService.java`
- Modify: `backend/src/main/java/com/wordweft/exception/GlobalExceptionHandler.java`
- Modify: import DTO/controller files discovered by the focused test
- Modify: `pages/CreateBookPage.tsx`
- Modify: `api/client.ts`
- Test: `backend/src/test/java/com/wordweft/manuscript/service/ManuscriptParserTest.java`
- Test: `backend/src/test/java/com/wordweft/manuscript/service/ManuscriptImportServiceTest.java`
- Test: `tests/manuscriptImport.test.ts`

1. Add tests for embedded image upload success, upload failure, oversized requests, and an import summary.
2. Raise manuscript request limit to 25 MB while retaining a 5 MB per-image guard.
3. Replace silent image-drop handling with a typed import failure and structured response.
4. Return counts/warnings and character candidates; render the import review with selectable character suggestions.
5. Create selected characters only after the writer confirms the imported story.

## Task 3: Require real Founding Writer R2 persistence

**Files:**
- Modify: `backend/src/main/java/com/wordweft/foundingwriter/service/FoundingWriterApplicationService.java`
- Modify: `backend/src/main/java/com/wordweft/foundingwriter/service/UploadTokenService.java`
- Test: `backend/src/test/java/com/wordweft/foundingwriter/service/FoundingWriterApplicationServiceTest.java`

1. Add failing tests for missing worker configuration and failed upload.
2. Remove fabricated keys and swallowed upload exceptions.
3. Persist/confirm the application only after successful R2 upload; surface a retriable failure.

## Task 4: Introduce chapter published snapshots

**Files:**
- Modify: `backend/src/main/java/com/wordweft/book/model/Chapter.java`
- Add: `backend/src/main/java/com/wordweft/book/service/PublishedChapterView.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/ChapterContentService.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/BookService.java`
- Modify: `backend/src/main/java/com/wordweft/discovery/service/HookFeedService.java`
- Modify: `backend/src/main/java/com/wordweft/seo/PublicSeoService.java`
- Modify: public chapter consumers found by search
- Test: `backend/src/test/java/com/wordweft/book/service/ChapterContentServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/discovery/service/HookFeedServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/seo/PublicSeoServiceTest.java`

1. Add tests proving public readers/SEO/feed retain the prior published title/content after an owner autosaves edits.
2. Add published title/content/word-count/date fields with backward-compatible fallback for existing published chapters.
3. Centralize working-versus-public selection in `PublishedChapterView`.
4. Migrate all public consumers and retain working content for owner/editor endpoints.

## Task 5: Centralize atomic publication transitions

**Files:**
- Modify: `backend/src/main/java/com/wordweft/book/service/ChapterPublishingService.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/ScheduledChapterPublisher.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/BookService.java`
- Modify: `backend/src/main/java/com/wordweft/book/controller/BookController.java`
- Add/modify publication request/response DTOs as needed
- Test: `backend/src/test/java/com/wordweft/book/service/ChapterPublishingServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/book/service/ScheduledChapterPublisherTest.java`
- Test: publication controller tests

1. Add a table-driven state-transition suite for draft story publication, prefix selection, chapter-triggered story publication, update publication, cascade unpublish, story-to-draft, and scheduler revalidation.
2. Implement transactional publication commands and contiguous-prefix validation.
3. Make every controller/scheduler call the centralized service.
4. Return a publication-impact preview so the UI can explain exactly what will happen.

## Task 6: Repair writer publication and autosave UI

**Files:**
- Modify: `pages/ChapterEditorPage.tsx`
- Modify: `pages/ManageChaptersPage.tsx`
- Modify: story management page(s) found during implementation
- Modify: `api/client.ts`
- Modify: `types.ts`
- Test: `tests/publishing.test.ts`
- Test: `tests/chapterRevisions.test.ts`

1. Add tests for separate autosave/publish state and publication confirmation copy.
2. Keep `Saving…`/`Saved` separate from `Publish`/`Publishing…`/`Publish updates`.
3. Add the ordered chapter-selection dialog and auto-select the required prefix.
4. Add the chapter-triggered story publication warning and cascade-unpublish explanation.

## Task 7: Make Hook Feed compact, stateful, and mobile-first

**Files:**
- Modify: `backend/src/main/java/com/wordweft/discovery/dto/HookFeedResponse.java`
- Modify: `backend/src/main/java/com/wordweft/discovery/service/HookFeedService.java`
- Modify: `pages/HookFeedPage.tsx`
- Modify: `index.css`
- Test: `backend/src/test/java/com/wordweft/discovery/service/HookFeedServiceTest.java`
- Test: `tests/hookFeed.test.ts`

1. Add tests for `isLiked`, pending-action guards, rollback, and visible first-viewport actions.
2. Return viewer-liked state and make like mutations idempotent.
3. Replace the expanded taste block with a working bottom sheet/dialog.
4. Use compact editorial copy, excerpt clamping, sticky/visible actions, and accessible controls.

## Task 8: Rework home discovery and responsive shelves

**Files:**
- Modify: `pages/HomePage.tsx`
- Modify: logged-out root page identified in `App.tsx`
- Modify: relevant modal/CTA components
- Modify: `index.css`
- Test: `tests/platformQuality.test.ts`

1. Add regression checks for direct hero copy, working CTA destinations, and shelf overflow rules.
2. Replace synthetic/decorative hero language and nonfunctional CTA behavior.
3. Make shelves use edge-safe scroll snapping and mobile card widths without body overflow.
4. Verify at iPhone SE, modern iPhone, tablet, and laptop widths.

## Task 9: Repair search relevance, feedback, semantics, and theme

**Files:**
- Modify: `backend/src/main/java/com/wordweft/search/service/SearchService.java`
- Modify: `backend/src/main/java/com/wordweft/search/controller/SearchController.java`
- Modify: `components/SearchOverlay.tsx`
- Modify: `index.css`
- Test: add `backend/src/test/java/com/wordweft/search/service/SearchServiceTest.java`
- Test: `tests/platformQuality.test.ts`

1. Add tests proving `Sri` finds `Srijib`, results are access-filtered before counts, and search failure is visible.
2. Add normalized prefix matching with typo-tolerant Atlas fallback.
3. Replace purple tokens with WordWeft theme tokens.
4. Use semantic links/buttons, dialog/focus behavior, loading/error/empty states, and keyboard navigation.

## Task 10: Repair reader mobile affordances and ratings

**Files:**
- Modify: `components/AgeRatingBadge.tsx`
- Modify: `pages/ReaderPage.tsx`
- Modify: reader coach/cue component located during implementation
- Modify: `index.css`
- Test: `tests/readerAccess.test.ts`
- Test: `tests/platformQuality.test.ts`

1. Add checks for hidden `ALL_AGES`, hover/focus-only desktop comments, touch-revealed mobile comments, and safe-area cue placement.
2. Hide only the default rating badge.
3. Replace permanent mobile paragraph plus controls with a selected-paragraph action.
4. Move cues/appearance controls into safe responsive sheets/popovers that cannot leave the viewport.

## Task 11: Full verification and local handoff

**Files:**
- Modify: `.env.example` and deployment documentation only if configuration gaps are found

1. Run the entire backend test suite.
2. Run frontend tests, typecheck, production build, SEO checks, and bundle checks.
3. Start backend on `0.0.0.0:8080` and frontend on `0.0.0.0:3000` (or the next available explicit ports).
4. Verify desktop and mobile flows in a browser, including authenticated actions where local credentials permit.
5. Confirm localhost and LAN health endpoints/HTML/API responses.
6. Review the final diff, commit all changes, and report exact URLs plus required Render/Vercel/Cloudflare variables.
