# WordWeft Community Design

## Product thesis

WordWeft Community connects readers with writers around stories. It is not a generic social network: every feed, circle, post format, and interaction should make it easier to discover a story, understand a creator's work, or exchange useful feedback.

## Goals

- Give readers a public Discover feed and an authenticated Following feed.
- Let users join lightweight topic Circles and browse their combined Circle feed.
- Support five purposeful post formats: `UPDATE`, `RELEASE`, `POLL`, `WORKSHOP`, and `RECOMMENDATION`.
- Allow optional book/chapter attachments with server-side ownership and publication checks.
- Add post detail, comments/replies, likes, saves, poll voting, reporting, editing, and deletion.
- Add an Activity tab to public author profiles.
- Reuse existing followers, notifications, reports, content access rules, users, books, and chapters.
- Remain usable and polished on mobile, tablet, desktop, light mode, and dark mode.

## Non-goals

- Direct messages, paid circles, private circles, document verification, arbitrary image uploads, reputation points, and algorithmic engagement optimization.
- A second follower graph or duplicated community-only user profile.
- Raw HTML or Markdown rendering in community content.

## Identity and permissions

Personas are multi-select interests, not security roles. `communityInterests` may contain `READING`, `WEBNOVEL_WRITING`, `EBOOK_PUBLISHING`, `WRITING_CRAFT`, and `CRITIQUE`.

Security roles remain `ROLE_USER`, `ROLE_MODERATOR`, and `ROLE_ADMIN`. Public trust markers are `VERIFIED_CREATOR`, `EDITORIAL_STAFF`, and `COMMUNITY_MODERATOR`. Only staff/system workflows assign roles and badges. Release attachment eligibility is derived from actual book ownership.

Guests may read active public community content and circles. Authentication is required to post, comment, vote, react, save, join, edit, delete, or moderate.

## User experience

`#/community` is the Weft Stream. Desktop uses a restrained three-column layout: circles on the left, the feed and composer in the center, and discovery prompts on the right. Mobile uses one column with sticky feed tabs and bottom sheets for circle/discovery navigation.

Feed tabs:

- `Discover`: cursor-paginated public posts with modest relevance ranking.
- `Following`: chronological posts from followed accounts.
- `Circles`: chronological posts from joined circles.

The compact composer expands into a modal. It asks for format, circle, body, optional title, optional owned story/chapter, optional warnings, and poll choices when applicable. Body content is plain text with preserved line breaks.

Post cards show author identity and badges, format, circle, timestamp, title/body, story attachment, poll, counts, and contextual actions. `#/community/post/:id` provides the full discussion. `#/community/circle/:slug` provides circle details, rules, join state, and its feed.

Public author pages gain an Activity tab. Book and reader pages expose `Discuss in Community`, opening the composer with the book/chapter preselected.

## Seed circles

- `general` — General discussion and progress updates.
- `new-releases` — Story and chapter releases.
- `critique-corner` — Workshop excerpts and structured feedback.
- `writing-craft` — Process, technique, and publishing discussion.
- `reader-recommendations` — Reader-led discovery and recommendations.

Seeds are idempotent and never overwrite an existing administrator-edited circle.

## Data model

### CommunityCircle

`id`, unique `slug`, `name`, `description`, `rules`, `accent`, `allowedPostTypes`, `memberCount`, `official`, `active`, `createdAt`, `updatedAt`.

### CommunityPost

`id`, indexed `authorId`, indexed `circleId`, `type`, `title`, `body`, `attachedBookId`, `attachedChapterId`, `contentWarnings`, `pollOptions`, `likeCount`, `commentCount`, `voteCount`, `pinned`, `locked`, indexed `status`, indexed `createdAt`, `updatedAt`.

Poll options contain stable IDs and text only. Voter IDs are never embedded in the post.

### CommunityComment

`id`, indexed `postId`, indexed `authorId`, `parentCommentId`, `body`, `likeCount`, `status`, `createdAt`, `updatedAt`. Replies support one nested level; replying to a reply targets its root comment.

### Relationship collections

- `CircleMembership`: unique compound `(userId, circleId)` and `joinedAt`.
- `CommunityReaction`: unique compound `(userId, targetType, targetId, reactionType)` for likes and saves.
- `CommunityPollVote`: unique compound `(userId, postId)` with `optionId` and `createdAt`.

Separate relationship records prevent MongoDB documents from growing without bounds and make uniqueness enforceable.

## API response model

Posts and comments store author IDs, not copied profile snapshots. Responses enrich current username, avatar, badges, and follow state. They also include viewer-specific `liked`, `saved`, `votedOptionId`, `joined`, `canEdit`, and `canModerate` flags without exposing voter or membership identities.

All lists use cursor pagination with `(createdAt, id)` cursors and a maximum page size of 30.

## Feed behavior

Following and Circles are chronological. Discover obtains a bounded recent candidate window and scores it using:

`recency + followed-author boost + joined-circle boost + interest/circle relevance + capped discussion-quality boost + pinned boost`.

Popularity is capped so older viral posts cannot permanently dominate. The response does not pretend the ordering is fully personalized when the viewer is a guest.

## Validation and access rules

- Title: optional except `RELEASE`, `WORKSHOP`, and `POLL`; 3–140 characters when present.
- Body: required, trimmed, 1–5,000 characters.
- Poll: 2–6 distinct options, each 1–100 characters; one immutable vote per account.
- A post must target an active circle whose allowed formats include its type.
- `RELEASE` attachments must belong to the author and be published.
- `RECOMMENDATION` attachments must be published and cannot point to the recommender's own book.
- Other attachments must be published or owned by the posting author.
- Attached chapter IDs must belong to the attached book.
- Posts attached to inaccessible age-restricted content are omitted from discovery for that viewer.
- Owners may edit body/title/warnings, but cannot change post type, circle, attachment, or poll choices after publication.
- Owners may soft-delete their content. Moderators may remove, restore, lock, and pin.
- Locked posts remain readable but reject new comments and votes.

## Safety and abuse resistance

Content is stored and rendered as text, preventing script injection. Creation limits are 12 posts/day, 60 comments/day, and 30 votes/day per user. Duplicate likes, saves, memberships, and poll votes are database-enforced.

The existing report system gains `COMMUNITY_POST` and `COMMUNITY_COMMENT` targets. Reported content is not automatically removed based on report count. Moderators decide action, preventing coordinated brigading. Deleted/removed content is excluded from normal feeds but retained for audit.

Users cannot interact with their own content in ways that inflate social proof: self-likes are rejected, while authors may vote in their own polls only when the post is not a reader-choice poll (launch behavior: all polls reject author self-votes for clarity).

## Notifications

- Notify post authors about new top-level comments.
- Notify comment authors about replies.
- Notify followers only for `RELEASE` posts, respecting `storyUpdates` preferences.
- Do not notify for likes, saves, ordinary updates, or votes.
- Aggregate/deduplicate through the existing notification service.

## Error handling

The backend returns stable `400`, `403`, `404`, and `409` responses with user-readable messages. The frontend uses inline composer validation, recoverable feed error panels, optimistic likes/saves/join state with rollback, and non-optimistic post/comment creation. Empty states provide a meaningful next action.

## Testing and verification

Backend tests cover validation, authorization, attachment rules, join idempotency, duplicate votes, reactions, comment depth/locking, feed selection, content-access filtering, and reporting targets. Controller tests cover guest reads and authenticated writes.

Frontend verification covers loading/empty/error/content states, all composer variants, feed switching, post detail, author Activity, guest sign-in gates, mobile navigation, dark mode, keyboard focus, and accessible dialog labels.

Production verification requires Maven tests, Vite build, `git diff --check`, and browser smoke tests at desktop and mobile widths.
