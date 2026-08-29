# Reader and Writer Growth Implementation Plan

**Goal:** Complete the approved Phase 1 and Phase 2 growth work while excluding export and all buddy-room/checkpoint functionality.

**Architecture:** Add narrow Spring services and Mongo documents for import/recovery, discovery preferences, challenges, and genre events. Reuse the existing user profile, reading stats, book visibility rules, and React hash-router structure.

## Task 1: Manuscript import

- [ ] Write parser tests for Markdown/text boundaries, DOCX headings, unsafe/empty uploads, and draft-only output.
- [ ] Implement the parser, ownership service, multipart endpoint, and import UI in story management.
- [ ] Run focused and full verification; commit.

## Task 2: Automatic chapter revisions

- [ ] Write service tests for throttled autosave capture, explicit recovery points, ownership, and restore.
- [ ] Implement revision model/repository/service/endpoints and editor history UI.
- [ ] Run focused and full verification; commit.

## Task 3: Taste profile and Hook Feed

- [ ] Write feed tests for published-only projection, genre ranking, exclusions, and safe excerpts.
- [ ] Implement taste preference API, feed service/controller, onboarding card, and swipe/keyboard-accessible feed page.
- [ ] Run focused and full verification; commit.

## Task 4: Reading challenges and genre events

- [ ] Write challenge progress and event eligibility tests.
- [ ] Implement documents/services/controllers plus individual challenge and public event UI.
- [ ] Add routes/navigation without any room, buddy-read, or checkpoint surface.
- [ ] Run focused and full verification; commit.

## Task 5: Final verification

- [ ] Run all frontend tests, typecheck, production build, and entry-bundle check.
- [ ] Run the complete backend suite.
- [ ] Inspect Git diff/status and summarize delivered behavior and exclusions.
