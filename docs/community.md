# WordWeft Community

The community is a story-centered stream with Discover, Following, My circles, and Saved feeds. Five official circles support updates, releases, polls, workshops, and reader recommendations. Readers can react, save, vote once, discuss posts, and reply; authors can edit or delete their own posts. Book and reader pages open a prefilled community composer, and author profiles show public Activity.

## Identity and safety

- Multi-select interests: Reader, Web-novel writer, E-book writer, Writing craft, and Critique. These describe a profile; they never grant permissions.
- Permissions use the existing `User.roles`: `ROLE_MODERATOR` or `ROLE_ADMIN` unlock moderation. Only `ROLE_ADMIN` may assign public trust badges via `PUT /api/community/members/{id}/badges`. There is no public/self-service role elevation endpoint. Provision staff roles through your trusted account-administration workflow.
- Public badges: verified creator, editorial staff, and community moderator. A badge alone does not grant access to moderation.
- Text is rendered as text, never HTML. Content warnings hide both the post and its discussion until deliberately revealed. Attached stories and chapters must pass publication/ownership and existing age-access checks; unavailable attachments remove their posts from feeds.
- Likes, saves, memberships, and votes use separate collections with unique indexes and deterministic primary keys. Counters are derived in batches, not vulnerable read/modify/write totals. Poll results are hidden until voting (except for the author).
- Creation limits are 12 posts, 60 comments, and 30 votes daily. Rolling-day counts and atomic daily reservation buckets resist concurrent requests. Buckets expire automatically.
- Reports reuse the existing reporting system. The staff queue conceals reporter identities, atomically claims each resolution, supports dismiss/remove, and records moderation events. Stale claims recover automatically after an interrupted resolver. Pin/lock/remove/restore actions require server-verified staff roles. Author-deleted content cannot be restored by moderators; staff can inspect removed content while reviewing it.
- Release posts notify followers; comments and replies notify the relevant author. Existing notification preferences apply. Other interactions do not create notification noise.

## Routes and persistence

- `#/community`, `#/community/circle/:slug`, `#/community/post/:id`
- `#/community?compose=1&bookId=...&chapterId=...&type=UPDATE` opens a prefilled composer.
- API namespace: `/api/community`. Public reads are explicitly allowlisted; all writes require authentication.
- Circle seeding is insert-only/idempotent and preserves existing administrator edits.
- Discover ranks a bounded chronological page by recency, follows, memberships, interests, and capped discussion activity. The pagination cursor follows chronological source order so changing reaction totals cannot repeat or skip posts. Following and My circles are chronological.
- Existing user records need no migration: missing interests and badges default to empty. MongoDB automatic index creation adds the new collection indexes on startup.
- Public author profiles use a privacy-limited projection and never traverse or expose the member's private library. Published works are loaded separately through the existing age-filtered book endpoint.

## Verification

Backend: `cd backend` then `mvn test`.

Frontend helpers: `node --test utils/community.test.cjs`.

Production bundle: `node node_modules/vite/bin/vite.js build`.

The optional real-database integration script is `node scripts/verify-community.mjs`. It is hard-wired to loopback and the synthetic accounts provided by the test-only `CommunityLocalPreview` runner. Never point these credentials or fixtures at a real environment.

Local preview setup:

1. Start an isolated MongoDB instance on `127.0.0.1:27028` with a new empty data directory, not your normal MongoDB data path.
2. In `backend`, run `mvn test-compile dependency:build-classpath -Dmdep.outputFile=target/community-classpath.txt -Dmdep.includeScope=test`.
3. Launch `com.wordweft.community.dev.CommunityLocalPreview` with `target/test-classes`, `target/classes`, and the generated dependency classpath. It uses only `wordweft_community_verification` on the isolated MongoDB instance. Email/image integrations are disabled in its test configuration.
4. Start Vite with process environment `VITE_API_BASE_URL=http://127.0.0.1:8080/api` and use `http://127.0.0.1:3000/#/community`.
5. Synthetic reader: `reader@example.test`; moderator: `moderator@example.test`; password for either: `CommunityTest123!`. These fixtures compile only into test classes, never the production artifact.

The integration script exercises actual HTTP authentication, permissions, concurrent likes, membership idempotency, saves, immutable polls, hidden results, comment depth/counts, reports, staff removal/restoration, tombstones, and cursor pagination. It soft-deletes only its own generated test post. Repeated runs consume the normal daily quotas by design.

## Deliberate boundaries

No DMs, paid/private circles, arbitrary media uploads, reputation scores, or verification application portal. This implementation is local code; deployment is a separate operation. Existing unrelated Tiptap/autoLinker TypeScript errors and large-bundle warnings are not introduced by Community.
