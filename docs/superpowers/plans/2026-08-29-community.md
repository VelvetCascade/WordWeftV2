# WordWeft Community Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a story-centered community with circles, feeds, posts, polls, discussions, profile activity, notifications, saves, and moderation/report integration.

**Architecture:** Add a focused Spring/Mongo community package with separate relationship collections and cursor feeds, then expose typed React clients and responsive community surfaces through the existing hash router. Reuse the current user, book, follow, content-access, notification, and reporting systems.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Security, Spring Data MongoDB, JUnit 5/Mockito, React 19, TypeScript 5.8, Vite 6, existing CSS design tokens.

**Spec:** `docs/superpowers/specs/2026-08-29-community-design.md`

## Global Constraints

- Community content is plain text and rendered without raw HTML.
- Guest reads are public; every mutation requires authentication.
- Security roles and public badges remain separate from multi-select interests.
- Relationship collections enforce uniqueness; never embed unbounded voter/member arrays.
- Existing age/content access, reports, notifications, and follower graph are authoritative.
- No DMs, paid/private circles, arbitrary media uploads, reputation points, or verification portal.

---

### Task 1: Community domain policy and validation

**Files:**
- Create: `backend/src/test/java/com/wordweft/community/service/CommunityPolicyTest.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityEnums.java`
- Create: `backend/src/main/java/com/wordweft/community/dto/CommunityDtos.java`
- Create: `backend/src/main/java/com/wordweft/community/service/CommunityPolicy.java`

**Interfaces:**
- Produces: `CommunityPolicy.validatePost(CreatePostRequest)`, `validateComment(String)`, and `normalizePollOptions(List<String>)`.

- [ ] Write failing tests for body/title boundaries, distinct 2–6 option polls, and required titles.
- [ ] Run `mvn -Dtest=CommunityPolicyTest test` and confirm failures reference missing community types.
- [ ] Implement enums, request/response DTOs, and minimal policy validation.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Persistence models and repository contracts

**Files:**
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityCircle.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityPost.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityComment.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CircleMembership.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityReaction.java`
- Create: `backend/src/main/java/com/wordweft/community/model/CommunityPollVote.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CommunityCircleRepository.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CommunityPostRepository.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CommunityCommentRepository.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CircleMembershipRepository.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CommunityReactionRepository.java`
- Create: `backend/src/main/java/com/wordweft/community/repository/CommunityPollVoteRepository.java`
- Modify: `backend/src/main/java/com/wordweft/user/model/User.java`
- Modify: `backend/src/main/java/com/wordweft/user/service/UserService.java`
- Modify: `backend/src/main/java/com/wordweft/user/dto/AuthDtos.java`
- Modify: `backend/src/main/java/com/wordweft/user/controller/UserController.java`

**Interfaces:**
- Produces repositories for active-circle lookup, cursor post lookup, comment lookup, membership/reaction/vote uniqueness, and user `communityInterests`/`communityBadges`.

- [ ] Write repository/model contract tests for defaults and compound-key behavior where Spring annotations are relied upon.
- [ ] Run focused tests and confirm they fail before the classes exist.
- [ ] Implement models, indexes, repositories, and user preference fields.
- [ ] Re-run focused tests.

### Task 3: Community service behavior

**Files:**
- Create: `backend/src/test/java/com/wordweft/community/service/CommunityServiceTest.java`
- Create: `backend/src/main/java/com/wordweft/community/service/CommunityService.java`
- Create: `backend/src/main/java/com/wordweft/community/service/CommunityMapper.java`

**Interfaces:**
- Consumes: repositories, `CommunityPolicy`, `ContentAccessService`, `UserRepository`, `BookRepository`, `NotificationService`.
- Produces: circle, feed, post, comment, membership, reaction, save, vote, ownership, and moderation methods consumed by the controller.

- [ ] Write failing service tests for creation, attachment ownership, recommendation self-attachment rejection, join idempotency, one vote per user, self-like rejection, locked comments, reply depth, and viewer flags.
- [ ] Run `mvn -Dtest=CommunityServiceTest test` and confirm expected failures.
- [ ] Implement the minimal service and mapper behavior.
- [ ] Re-run focused tests and refactor only while green.

### Task 4: REST, seeds, notifications, and reports

**Files:**
- Create: `backend/src/test/java/com/wordweft/community/controller/CommunityControllerTest.java`
- Create: `backend/src/main/java/com/wordweft/community/controller/CommunityController.java`
- Create: `backend/src/main/java/com/wordweft/community/init/CommunityCircleSeeder.java`
- Modify: `backend/src/main/java/com/wordweft/config/SecurityConfig.java`
- Modify: `backend/src/main/java/com/wordweft/notification/service/NotificationService.java`
- Modify: `backend/src/main/java/com/wordweft/report/service/ReportService.java`

**Interfaces:**
- Produces `/api/community/circles`, `/api/community/feed`, `/api/community/posts`, post interaction, comment, vote, and moderation endpoints.

- [ ] Write failing MockMvc tests proving guest GET access and authenticated mutation requirements.
- [ ] Write failing report resolution tests for community posts/comments.
- [ ] Run the focused tests and observe the missing routes/targets failures.
- [ ] Implement controller, security GET permit, idempotent seed data, notification routing, and report targets.
- [ ] Re-run controller/report tests.

### Task 5: Frontend contracts and API client

**Files:**
- Modify: `types.ts`
- Modify: `api/client.ts`
- Create: `utils/community.ts`

**Interfaces:**
- Produces typed community entities, filters, cursor pages, form normalization, time formatting, and API methods used by React components.

- [ ] Add testable pure normalization helpers and a Node behavior test for poll cleanup, cursor merging, and validation messages.
- [ ] Run the Node test and confirm missing exports fail.
- [ ] Implement types, helpers, and API calls with shared response error parsing.
- [ ] Re-run the helper test.

### Task 6: Community feed, cards, composer, and discussions

**Files:**
- Create: `pages/CommunityPage.tsx`
- Create: `pages/CommunityPostPage.tsx`
- Create: `components/community/CommunityComposer.tsx`
- Create: `components/community/CommunityPostCard.tsx`
- Create: `components/community/CommunityComments.tsx`
- Create: `components/community/CommunityCircleRail.tsx`
- Create: `components/community/CommunityEmptyState.tsx`
- Modify: `index.css`

**Interfaces:**
- Consumes API client/types; produces responsive feed and post-detail experiences.

- [ ] Implement accessible loading, empty, error, and content states.
- [ ] Implement composer variants with inline validation and sign-in gates.
- [ ] Implement optimistic join/like/save with rollback; keep create/comment non-optimistic.
- [ ] Implement cursor load-more, poll results, edit/delete/report actions, and keyboard-accessible dialogs.
- [ ] Run Vite build after each coherent component group.

### Task 7: Routes, navigation, profile activity, and story entry points

**Files:**
- Modify: `App.tsx`
- Modify: `components/Navbar.tsx`
- Modify: `pages/AuthorPage.tsx`
- Modify: `pages/BookDetailsPage.tsx`
- Modify: `pages/ReaderPage.tsx`
- Create: `components/community/ProfileActivity.tsx`

**Interfaces:**
- Produces `#/community`, `#/community/post/:id`, `#/community/circle/:slug`, profile Activity, and prefilled composer navigation.

- [ ] Add routes and metadata without breaking existing hash navigation/back behavior.
- [ ] Add desktop/mobile Community navigation and active states.
- [ ] Add Activity tab and story/chapter community entry actions.
- [ ] Run React best-practices review and production build.

### Task 8: Full verification and polish

**Files:**
- Modify only files implicated by verification findings.

- [ ] Run `mvn test` and confirm all focused and full backend tests pass.
- [ ] Run frontend helper tests and the Vite production build.
- [ ] Run `git diff --check`.
- [ ] Start the local app and browser-test guest and authenticated-compatible flows at desktop and mobile widths, including dark mode.
- [ ] Verify all spec requirements against the diff and document any intentionally deferred non-goals.
