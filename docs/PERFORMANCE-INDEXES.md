# MongoDB performance indexes

These indexes are declared on Spring Data document models. The application already sets `spring.data.mongodb.auto-index-creation=true`, so Spring creates missing indexes when it initializes the mapped entities. No migration runner or manual index creation is required. The database account needs permission to create indexes. Index creation on existing large collections can add startup time and consume database resources.

The definitions add query support without changing document contents. Existing indexes, unique constraints, and TTL policies remain declared. All additions are nonunique, and none introduce expiration. Chapter text, summaries, descriptions, comments, and other large text bodies are not indexed.

## Added definitions and queries

Keys below are MongoDB storage field names, in index order. `+` means ascending and `-` means descending. Java `Book.id` is stored as `_id`; the catalog sorts and cursor indexes use `_id`.

| Collection | Added keys | Query supported |
| --- | --- | --- |
| `books` | `publicationStatus+`, `readCountLast7Days-`, `readCount-`, `_id+` | Most-read catalog pages and discovery hero ordering |
| `books` | `publicationStatus+`, `viewCountLast7Days-`, `viewCount-`, `_id+` | Most-viewed catalog pages |
| `books` | `publicationStatus+`, `lastUpdatedAt-`, `publishedDate-`, `_id+` | Recently updated catalog pages |
| `books` | `publicationStatus+`, `createdAt-`, `publishedDate-`, `_id+` | New-story catalog pages |
| `books` | `authorId+`, `publicationStatus+`, `_id+` | Author lists and published author SEO pages |
| `books` | `publicationStatus+`, `_id+` | Published SEO pages and book sitemap ordering |
| `books` | `publicationStatus+`, `genres+`, `_id+` | Exact genre SEO filter with ID ordering |
| `books` | `publicationStatus+`, `tags+`, `_id+` | Exact tag SEO filter with ID ordering |
| `books` | `chapters.status+`, `chapters.scheduledAt+` | Due-chapter scheduler's same-element `$elemMatch` |
| `characters` | `bookId+` | Book character lists and book deletion |
| `comments` | `chapterId+`, `createdAt-`; `bookId+`, `userId+` | Chapter comments in date order; chapter/book cleanup and user/book cleanup |
| `reviews` | `bookId+`, `userId+` | Book reviews, author-viewed reviews, and cleanup; duplicates remain permitted |
| `notes`, `scenes` | Separate `bookId+` and `chapterId+` indexes | Book or chapter lists and book deletion |
| `reading_progress`, `library`, `chapter_revisions` | `bookId+` | Book-scoped progress analytics, chapter cleanup, and book deletion |
| `chapter_read_events` | `bookId+`, `occurredAt+`; separate `chapterId+` | Writer analytics by book and time range; book/chapter deletion |
| `feedback` | `userId+`, `submittedAt-` | Recent-feedback count and per-user feedback |
| `notifications` | `userId+`, `createdAt-` | Notification page ordered newest first |
| `notifications` | `userId+`, `type+`, `createdAt-` | Notification type-filtered page ordered newest first |
| `notifications` | `userId+`, `read+` | Unread count and marking unread notifications read |
| `notifications` | `userId+`, `type+`, `entityId+`, `createdAt-` | Recent-notification deduplication |
| `users` | Sparse `resetPasswordToken+` | Direct password-reset token lookup; token expiry remains an application check |
| `community_posts`, `community_comments` | `authorId+`, `createdAt-` | Per-author daily write-limit counts |
| `community_poll_votes` | `userId+`, `createdAt-` | Per-user daily voting-limit count |
| `community_reactions` | `targetType+`, `targetId+`, `reactionType+` | Batch reaction totals for visible posts or comments |

The existing community feed, author, circle, and comment cursor indexes already support live community pagination. The new time indexes support daily-limit queries that do not filter on status; status between author and date in the feed index cannot tightly bound those time queries. The existing unique user-first reaction and vote indexes continue to support viewer lookups.

The pre-existing read-event and community-quota `expiresAt` declarations are untouched. Inspection with Spring Data MongoDB 4.2.2 and local MongoDB 7.0.43 showed that their existing `expireAfter="0s"` annotations created ordinary `expiresAt` indexes without `expireAfterSeconds`. This change preserves their current behavior; it does not add or repair TTL policies.

## Query limits

Atlas Search is separate from these Spring-created ordinary indexes. The existing fuzzy-search code uses `booksSearchIndex` on `books` (string fields `title`, `summary`, `genres`, `tags`, `description`, `publicationStatus`) and `userSearchIndex` on `users` (string fields `username`, `bio`). Existing dynamic string mappings may already cover them. Those Atlas Search definitions remain managed in Atlas; ordinary Spring index annotations do not create them. Standalone MongoDB retains the native search fallback.

Genre and tag arrays use separate indexes. Combining both arrays in one compound index would be an illegal parallel-array index for normal books. The scheduled-chapter index is legal because its two fields belong to the same `chapters` array; `$elemMatch` allows MongoDB to compound their bounds against one chapter.

The public catalog's case-insensitive genre/category regexes and search's case-insensitive substring regexes do not gain efficient string lookup from ordinary B-tree indexes. The genre/tag indexes above support the SEO service's exact equality filters. The publication-status and sort prefixes still reduce work for eligible catalog queries, while age ratings, maturity, warnings, regexes, and published-chapter guards are residual filters. Selectivity and viewer restrictions can cause more documents to be examined than returned.

Distinct values, grouped counts, computed taste rankings, and sitemap pipelines that unwind/group chapter metadata still have to inspect eligible metadata. An index does not remove those aggregate operations or deep-offset pagination cost. The projection changes elsewhere bound database response sizes; these indexes address lookup and sort work.

## Verification

`PerformanceIndexesMongoTest` is opt-in and starts Spring's MongoDB data configuration with automatic index creation. It owns a fresh randomly named database and removes it after the run. With 2,000 fixture documents per tested collection, it executes unhinted `explain("executionStats")` queries for the production filters and the catalog service's mapped sort definitions. Assertions reject collection scans, blocking sorts, and unrelated document reads for selective fixture queries. It also saves books containing multiple genre/tag values and multiple scheduled chapter elements, checks same-element scheduler correctness, permits duplicate reviews/reset tokens, preserves existing uniqueness and the `expiresAt` index, and verifies that no users TTL index exists.

```bash
cd backend
WORDWEFT_TEST_MONGO_URI=mongodb://127.0.0.1:27028 mvn -Dtest=PerformanceIndexesMongoTest test
```

The test is skipped when `WORDWEFT_TEST_MONGO_URI` is absent. Supply an authorized disposable MongoDB instance. The generated test database name overrides any database name in the URI.

Inspect deployed definitions and a representative plan using read-only MongoDB commands:

```javascript
db.books.getIndexes()
db.notifications.getIndexes()
db.users.getIndexes()
db.books.find({publicationStatus: "published"})
  .sort({readCountLast7Days: -1, readCount: -1, _id: 1})
  .limit(20)
  .explain("executionStats")
```

Compare `nReturned`, `totalDocsExamined`, `totalKeysExamined`, and the winning plan against the actual query and data distribution. Local synthetic plans establish correct definitions and planner eligibility; they are not production latency measurements.
