# Reader and Writer Growth Implementation Plan

**Goal:** Complete the approved Phase 1 and Phase 2 growth work while excluding export and all buddy-room/checkpoint functionality.

**Architecture:** Add narrow Spring services and Mongo documents for import/recovery, discovery preferences, challenges, and genre events. Reuse the existing user profile, reading stats, book visibility rules, and React hash-router structure.

## Task 1: Manuscript import

- [x] Write parser tests for Markdown/text boundaries, DOCX headings, unsafe/empty uploads, and draft-only output.
- [x] Implement the parser, ownership service, multipart endpoint, and import UI in story management.
- [x] Run focused and full verification; commit.

## Task 2: Automatic chapter revisions

- [x] Write service tests for throttled autosave capture, explicit recovery points, ownership, and restore.
- [x] Implement revision model/repository/service/endpoints and editor history UI.
- [x] Run focused and full verification; commit.

## Task 3: Taste profile and Hook Feed

- [x] Write feed tests for published-only projection, genre ranking, exclusions, and safe excerpts.
- [x] Implement taste preference API, feed service/controller, onboarding card, and swipe/keyboard-accessible feed page.
- [x] Run focused and full verification; commit.

## Task 4: Reading challenges and genre events

- [x] Write challenge progress and event eligibility tests.
- [x] Implement documents/services/controllers plus individual challenge and public event UI.
- [x] Add routes/navigation without any room, buddy-read, or checkpoint surface.
- [x] Run focused and full verification; commit.

## Task 5: Final verification

- [x] Run all frontend tests, typecheck, production build, and entry-bundle check.
- [x] Run the complete backend suite.
- [x] Inspect Git diff/status and summarize delivered behavior and exclusions.
