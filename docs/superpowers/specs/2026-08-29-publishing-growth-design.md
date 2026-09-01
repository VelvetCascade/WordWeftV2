# Publishing Growth Design

## Purpose

This increment gives WordWeftt writers two connected capabilities: reliable scheduled chapter publishing and privacy-conscious performance analytics. Release timestamps and read events form the shared foundation, so writers can see whether a release caused readers to start, continue, or finish a story.

## Scope

- Writers can schedule a saved chapter for a future instant, cancel the schedule, or publish immediately.
- Due chapters publish automatically, update the story's public recency, and notify followers once.
- Public story data exposes the next scheduled release date without exposing other draft information.
- Writers can view portfolio, per-story, and per-chapter analytics.
- Analytics include views, unique readers, completed readers, continuation, comments, likes, average completion, returning readers, referrers, and fourteen-day trends.
- Anonymous reading is counted through a random browser session identifier; raw IP addresses and demographic attributes are not collected.

## Explicit exclusions

- Manuscript export is not implemented.
- Buddy reads, reading rooms, spoiler checkpoints, and direct messages are not implemented.
- Demographic profiling, cross-site tracking, and precise location analytics are not implemented.
- Cover/title experiments are deferred until the base analytics are trustworthy.
- Import/backups, Hook Feed/taste onboarding, and challenges/events are separate increments that will consume this foundation.

## Data model

### Embedded chapter release state

`Chapter` keeps its existing embedded-book representation and adds:

- `status`: `draft`, `scheduled`, or `published`.
- `scheduledAt`: nullable UTC `Instant`.
- `publishedAt`: nullable UTC `Instant` recording the most recent transition to published.

At most one future schedule exists per chapter. Moving a scheduled chapter back to draft clears `scheduledAt`. Publishing clears `scheduledAt` and sets `publishedAt`.

### Chapter read event

`ChapterReadEvent` is a separate MongoDB document with a deterministic daily identifier derived from book, chapter, reader key, and UTC date. It stores book ID, chapter ID, hashed reader key, authenticated user ID when present, UTC timestamp, UTC date, and a normalized referrer source. Repeated opens by the same reader on the same UTC day update the timestamp but do not create another unique-read record. An `expiresAt` TTL field removes event rows after 400 days.

The existing aggregate view counters remain for backward compatibility. New writer analytics use event rows when available and display the legacy counters as total views.

### Reading progress

Existing `ReadingProgress` documents remain the source of truth for completion and chapter-to-chapter continuation. The repository adds book-scoped reads so the writer analytics service can aggregate only the selected writer-owned story.

## Backend components

### ChapterPublishingService

This service owns every chapter status transition. It validates story ownership, requires a non-empty title and content before scheduling or publishing, rejects schedules less than two minutes or more than one year in the future, and centralizes follower notifications. Controller code no longer duplicates publish behavior.

### ScheduledChapterPublisher

A Spring scheduler runs every 30 seconds. It loads books containing due scheduled chapters, publishes each due chapter through `ChapterPublishingService`, and saves a book only when a transition occurred. The transition is idempotent: a chapter that is no longer `scheduled` cannot publish or notify twice.

### ChapterReadEventService

The public read endpoint accepts an optional browser session ID and referrer. The service validates the session format, falls back to an authenticated user key when available, hashes the key, upserts the daily event, and increments the legacy view counter. Untrusted referrers are reduced to a small source label (`direct`, `wordweft`, or a hostname).

### WriterGrowthService

The authenticated analytics endpoint accepts an optional story ID. The service first verifies that every requested story belongs to the current writer, then returns:

- portfolio totals;
- a list of story summaries;
- chapter funnel rows ordered by manuscript order;
- fourteen daily trend points;
- referrer totals;
- release markers.

Continuation for chapter N is `readers who reached chapter N+1 / readers who reached chapter N`. Completion uses progress at or above 90%. Returning readers have progress recorded in at least two chapters. Rates use zero when the denominator is zero.

## API contracts

- `PUT /api/books/{bookId}/chapters/{chapterId}/schedule` with `{ "scheduledAt": "2026-09-01T12:30:00Z" }` schedules a chapter and returns the refreshed user profile.
- `DELETE /api/books/{bookId}/chapters/{chapterId}/schedule` returns the chapter to draft and returns the refreshed user profile.
- Existing chapter save accepts `draft` or `published`; scheduling uses the dedicated endpoint.
- `POST /api/books/{bookId}/chapters/{chapterId}/view` accepts `{ "sessionId": "uuid", "referrer": "..." }`, is public, and returns `204`.
- `GET /api/writer/analytics?bookId={optional}` returns the analytics response and requires authentication.

Public book responses include `nextScheduledReleaseAt` and chapter `scheduledAt`/`publishedAt` only for the owning writer. Public readers never receive unpublished chapter content or private schedule metadata other than the next release date.

## Frontend experience

### Scheduling

The chapter editor keeps `Save draft` and `Publish`. A new `Schedule` action opens a compact dialog with the reader's local date and time, the corresponding timezone, validation feedback, and a confirmation button. The manage-story chapter list shows `Scheduled`, the local release time, and a cancel action. Public story pages show a small next-release card when a future release exists.

### Writer analytics

The existing analytics placeholder becomes `WriterAnalyticsPage`. It contains:

- story selector;
- summary cards for readers, views, completion, and returning readers;
- a fourteen-day lightweight CSS/SVG-free bar trend using semantic divs;
- chapter funnel table with views, reached, completion, continuation, likes, and comments;
- referrer list and release markers;
- honest empty states explaining that analytics begin as readers interact.

No chart dependency is added.

## Error handling

- Invalid or past schedule: `400` with a user-readable message.
- Non-owner analytics or scheduling access: `403`.
- Missing story or chapter: `404`.
- Scheduler failure for one book is logged and does not stop later books.
- Analytics aggregation tolerates legacy books, missing timestamps, and missing progress maps.
- The frontend keeps the draft intact when a schedule request fails and surfaces the backend message.

## Testing

- Unit tests cover scheduling bounds, state transitions, notification idempotency, due publishing, reader-key hashing/upsert behavior, analytics ownership, and funnel calculations.
- Controller tests cover authentication and response status for analytics and schedule endpoints.
- Frontend pure-function tests cover local datetime-to-UTC conversion, analytics rate formatting, and empty series normalization.
- Full verification runs backend tests, frontend tests, TypeScript typecheck, production build, and the existing bundle check.

## Rollout and compatibility

MongoDB adds nullable fields and a new collection, so existing documents require no migration. Existing published chapters without `publishedAt` use the book's published date as a display-only fallback. The scheduled publisher is enabled in the application configuration and is safe to run on multiple instances because each transition rechecks status before notifying; exact multi-instance atomic claiming can be added when the deployment scales beyond one backend instance.
