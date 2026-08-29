# Publishing Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add scheduled chapter releases and a privacy-conscious writer analytics dashboard backed by durable read events and existing reading progress.

**Architecture:** Centralize chapter state transitions in a publishing service, record deduplicated daily chapter reads in MongoDB, and aggregate writer-owned books through a dedicated analytics service. Expose narrow REST contracts and replace the frontend analytics placeholder with a typed dashboard while extending the existing editor and story pages for scheduling.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Data MongoDB, JUnit 5, Mockito, React 19, TypeScript 5.8, Vite 6, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-29-publishing-growth-design.md`

## Global Constraints

- Do not implement manuscript export.
- Do not implement buddy reads, reading rooms, spoiler checkpoints, or direct messages.
- Do not collect raw IP addresses, demographics, or precise location.
- Do not add a chart dependency.
- Preserve compatibility with legacy books and chapters whose new timestamps are null.

---

### Task 1: Chapter scheduling domain

**Files:**
- Modify: `backend/src/main/java/com/wordweft/WordWeftApplication.java`
- Modify: `backend/src/main/java/com/wordweft/book/model/Chapter.java`
- Modify: `backend/src/main/java/com/wordweft/book/repository/BookRepository.java`
- Create: `backend/src/main/java/com/wordweft/book/service/ChapterPublishingService.java`
- Create: `backend/src/main/java/com/wordweft/book/service/ScheduledChapterPublisher.java`
- Test: `backend/src/test/java/com/wordweft/book/service/ChapterPublishingServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/book/service/ScheduledChapterPublisherTest.java`

**Interfaces:**
- Produces: `ChapterPublishingService.schedule(String authorId, String bookId, String chapterId, Instant scheduledAt)`.
- Produces: `ChapterPublishingService.cancelSchedule(String authorId, String bookId, String chapterId)`.
- Produces: `ChapterPublishingService.publishNow(String authorId, String bookId, String chapterId)`.
- Produces: `BookRepository.findBooksWithDueChapters(Instant now)`.

- [ ] **Step 1: Write failing scheduling service tests**

```java
@Test void scheduleStoresUtcInstantAndScheduledStatus() {
    Instant release = Instant.now().plus(2, ChronoUnit.HOURS);
    service.schedule("author", "book", "chapter", release);
    assertEquals("scheduled", chapter.getStatus());
    assertEquals(release, chapter.getScheduledAt());
}

@Test void publishNowClearsScheduleAndNotifiesOnce() {
    chapter.setStatus("scheduled");
    chapter.setScheduledAt(Instant.now().minusSeconds(30));
    service.publishNow("author", "book", "chapter");
    service.publishDue(book, Instant.now());
    assertEquals("published", chapter.getStatus());
    assertNull(chapter.getScheduledAt());
    verify(notifications, times(1)).notifyFollowers(eq("author"), eq("AUTHOR_NEW_CHAPTER"), any(), any(), any(), any());
}
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `cd backend && mvn -Dtest=ChapterPublishingServiceTest,ScheduledChapterPublisherTest test`

Expected: compilation fails because the scheduling types and services do not exist.

- [ ] **Step 3: Add timestamps, repository query, services, and `@EnableScheduling`**

```java
@Query("{'chapters': {$elemMatch: {'status': 'scheduled', 'scheduledAt': {$lte: ?0}}}}")
List<Book> findBooksWithDueChapters(Instant now);
```

`ChapterPublishingService` must verify ownership, validate non-empty chapter content, enforce a two-minute to one-year scheduling window, update book dates, save, and notify after a successful transition. `ScheduledChapterPublisher` calls `publishDue(book, clock.instant())` every 30 seconds and isolates errors per book.

- [ ] **Step 4: Run scheduling tests and the backend suite**

Run: `cd backend && mvn -Dtest=ChapterPublishingServiceTest,ScheduledChapterPublisherTest test`

Expected: both classes pass.

Run: `cd backend && mvn test`

Expected: the complete backend suite passes.

- [ ] **Step 5: Commit the scheduling domain**

```bash
git add backend/src/main/java/com/wordweft/WordWeftApplication.java backend/src/main/java/com/wordweft/book/model/Chapter.java backend/src/main/java/com/wordweft/book/repository/BookRepository.java backend/src/main/java/com/wordweft/book/service/ChapterPublishingService.java backend/src/main/java/com/wordweft/book/service/ScheduledChapterPublisher.java backend/src/test/java/com/wordweft/book/service/ChapterPublishingServiceTest.java backend/src/test/java/com/wordweft/book/service/ScheduledChapterPublisherTest.java
git commit -m "feat: add scheduled chapter publishing domain"
```

### Task 2: Scheduling REST API and public release projection

**Files:**
- Modify: `backend/src/main/java/com/wordweft/book/controller/BookController.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/BookService.java`
- Test: `backend/src/test/java/com/wordweft/book/controller/BookSchedulingControllerTest.java`
- Test: `backend/src/test/java/com/wordweft/book/service/BookServiceReleaseProjectionTest.java`

**Interfaces:**
- Consumes: `ChapterPublishingService` methods from Task 1.
- Produces: schedule `PUT` and `DELETE` endpoints.
- Produces: public `nextScheduledReleaseAt` response field.

- [ ] **Step 1: Write failing controller and projection tests**

```java
@Test void ownerCanScheduleAChapter() throws Exception {
    mvc.perform(put("/api/books/book/chapters/chapter/schedule")
            .with(user(details))
            .contentType(APPLICATION_JSON)
            .content("{\"scheduledAt\":\"2026-09-01T12:30:00Z\"}"))
        .andExpect(status().isOk());
    verify(publishing).schedule("author", "book", "chapter", Instant.parse("2026-09-01T12:30:00Z"));
}

@Test void publicProjectionShowsOnlyTheEarliestFutureRelease() {
    Map<String, Object> response = service.enrichBook(book, null);
    assertEquals(firstRelease, response.get("nextScheduledReleaseAt"));
}
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `cd backend && mvn -Dtest=BookSchedulingControllerTest,BookServiceReleaseProjectionTest test`

Expected: tests fail because endpoints and projection do not exist.

- [ ] **Step 3: Implement endpoints and owner-aware projection**

Add a request DTO with an `Instant scheduledAt`, delegate status transitions to `ChapterPublishingService`, and return the refreshed profile. In `BookService`, include only published chapters for non-owners, expose private timestamps to owners, and calculate the single earliest future `nextScheduledReleaseAt` for public readers.

- [ ] **Step 4: Run targeted and full backend tests**

Run: `cd backend && mvn -Dtest=BookSchedulingControllerTest,BookServiceReleaseProjectionTest test`

Expected: targeted tests pass.

Run: `cd backend && mvn test`

Expected: the backend suite passes.

- [ ] **Step 5: Commit the scheduling API**

```bash
git add backend/src/main/java/com/wordweft/book/controller/BookController.java backend/src/main/java/com/wordweft/book/service/BookService.java backend/src/test/java/com/wordweft/book/controller/BookSchedulingControllerTest.java backend/src/test/java/com/wordweft/book/service/BookServiceReleaseProjectionTest.java
git commit -m "feat: expose chapter scheduling and release dates"
```

### Task 3: Durable privacy-conscious read events

**Files:**
- Create: `backend/src/main/java/com/wordweft/analytics/model/ChapterReadEvent.java`
- Create: `backend/src/main/java/com/wordweft/analytics/repository/ChapterReadEventRepository.java`
- Create: `backend/src/main/java/com/wordweft/analytics/service/ChapterReadEventService.java`
- Modify: `backend/src/main/java/com/wordweft/book/controller/BookController.java`
- Modify: `backend/src/main/java/com/wordweft/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/wordweft/analytics/service/ChapterReadEventServiceTest.java`

**Interfaces:**
- Produces: `ChapterReadEventService.record(String bookId, String chapterId, String userId, String sessionId, String referrer, Instant now)`.
- Produces: repository queries by author-owned book IDs and date range.

- [ ] **Step 1: Write failing deduplication and privacy tests**

```java
@Test void sameReaderAndChapterAreUniquePerUtcDay() {
    service.record("book", "chapter", null, SESSION_ID, "https://example.com/post", NOW);
    service.record("book", "chapter", null, SESSION_ID, "https://example.com/post", NOW.plusSeconds(60));
    verify(events, times(2)).save(eventCaptor.capture());
    assertEquals(eventCaptor.getAllValues().get(0).getId(), eventCaptor.getAllValues().get(1).getId());
}

@Test void eventStoresAHashInsteadOfTheBrowserIdentifier() {
    service.record("book", "chapter", null, SESSION_ID, "", NOW);
    assertNotEquals(SESSION_ID, eventCaptor.getValue().getReaderKeyHash());
}
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd backend && mvn -Dtest=ChapterReadEventServiceTest test`

Expected: compilation fails because read-event classes do not exist.

- [ ] **Step 3: Implement event upsert and public endpoint**

Use SHA-256 for the stored reader key, a deterministic daily document ID, a 400-day TTL date, UUID validation for anonymous sessions, and hostname-only referrer normalization. Explicitly permit only the chapter-view POST route for anonymous requests.

- [ ] **Step 4: Run targeted and full backend tests**

Run: `cd backend && mvn -Dtest=ChapterReadEventServiceTest test`

Expected: event tests pass.

Run: `cd backend && mvn test`

Expected: the backend suite passes.

- [ ] **Step 5: Commit read events**

```bash
git add backend/src/main/java/com/wordweft/analytics backend/src/main/java/com/wordweft/book/controller/BookController.java backend/src/main/java/com/wordweft/config/SecurityConfig.java backend/src/test/java/com/wordweft/analytics/service/ChapterReadEventServiceTest.java
git commit -m "feat: record privacy-conscious chapter reads"
```

### Task 4: Writer analytics aggregation and API

**Files:**
- Modify: `backend/src/main/java/com/wordweft/book/repository/ReadingProgressRepository.java`
- Create: `backend/src/main/java/com/wordweft/analytics/dto/WriterAnalyticsResponse.java`
- Create: `backend/src/main/java/com/wordweft/analytics/service/WriterGrowthService.java`
- Create: `backend/src/main/java/com/wordweft/analytics/controller/WriterAnalyticsController.java`
- Test: `backend/src/test/java/com/wordweft/analytics/service/WriterGrowthServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/analytics/controller/WriterAnalyticsControllerTest.java`

**Interfaces:**
- Produces: `WriterGrowthService.getAnalytics(String authorId, String bookId, Instant now)`.
- Produces: `GET /api/writer/analytics?bookId=`.

- [ ] **Step 1: Write failing ownership and funnel tests**

```java
@Test void continuationUsesReadersWhoReachedTheNextChapter() {
    WriterAnalyticsResponse result = service.getAnalytics("author", "book", NOW);
    assertEquals(50.0, result.chapterFunnel().get(0).continuationRate());
}

@Test void anotherAuthorsStoryIsRejected() {
    assertThrows(AccessDeniedException.class, () -> service.getAnalytics("intruder", "book", NOW));
}
```

- [ ] **Step 2: Run analytics tests and verify RED**

Run: `cd backend && mvn -Dtest=WriterGrowthServiceTest,WriterAnalyticsControllerTest test`

Expected: compilation fails because the response, service, and controller do not exist.

- [ ] **Step 3: Implement aggregation and authenticated controller**

Aggregate legacy counters, read events, and progress into immutable response records. Produce exactly fourteen UTC daily buckets including zero days. Treat null maps and counters as empty/zero, calculate rates defensively, and reject non-owned story IDs.

- [ ] **Step 4: Run analytics and full backend tests**

Run: `cd backend && mvn -Dtest=WriterGrowthServiceTest,WriterAnalyticsControllerTest test`

Expected: analytics tests pass.

Run: `cd backend && mvn test`

Expected: backend suite passes.

- [ ] **Step 5: Commit writer analytics backend**

```bash
git add backend/src/main/java/com/wordweft/book/repository/ReadingProgressRepository.java backend/src/main/java/com/wordweft/analytics/dto/WriterAnalyticsResponse.java backend/src/main/java/com/wordweft/analytics/service/WriterGrowthService.java backend/src/main/java/com/wordweft/analytics/controller/WriterAnalyticsController.java backend/src/test/java/com/wordweft/analytics/service/WriterGrowthServiceTest.java backend/src/test/java/com/wordweft/analytics/controller/WriterAnalyticsControllerTest.java
git commit -m "feat: add writer growth analytics API"
```

### Task 5: Frontend scheduling contracts and utilities

**Files:**
- Modify: `types.ts`
- Modify: `api/client.ts`
- Create: `utils/publishing.ts`
- Test: `tests/publishing.test.ts`

**Interfaces:**
- Produces: `scheduleChapter(bookId, chapterId, scheduledAt): Promise<User>`.
- Produces: `cancelChapterSchedule(bookId, chapterId): Promise<User>`.
- Produces: `toUtcSchedule(localValue: string, now?: Date): string`.

- [ ] **Step 1: Write failing UTC conversion tests**

```typescript
test('toUtcSchedule rejects an invalid local value', () => {
  assert.throws(() => toUtcSchedule('not-a-date'), /valid release time/i);
});

test('toUtcSchedule emits an ISO UTC instant', () => {
  assert.match(toUtcSchedule('2026-09-01T18:00'), /^2026-09-01T\d{2}:\d{2}:00\.000Z$/);
});
```

- [ ] **Step 2: Run the frontend test and verify RED**

Run: `node --test tests/publishing.test.ts`

Expected: test fails because `utils/publishing.ts` does not exist.

- [ ] **Step 3: Add typed contracts, API calls, and conversion utility**

Extend `Chapter.status` to include `scheduled`, add nullable schedule/publication timestamps and `Book.nextScheduledReleaseAt`, and make `recordChapterView` send a stable local UUID plus `document.referrer` without requiring authentication.

- [ ] **Step 4: Run frontend tests and typecheck**

Run: `npm test`

Expected: frontend tests pass.

Run: `npm run typecheck`

Expected: TypeScript reports no new errors from these files.

- [ ] **Step 5: Commit frontend scheduling contracts**

```bash
git add types.ts api/client.ts utils/publishing.ts tests/publishing.test.ts
git commit -m "feat: add frontend publishing schedule contracts"
```

### Task 6: Chapter scheduling UI and public next-release card

**Files:**
- Create: `components/ScheduleChapterDialog.tsx`
- Modify: `pages/ChapterEditorPage.tsx`
- Modify: `pages/ManageChaptersPage.tsx`
- Modify: `pages/BookDetailsPage.tsx`
- Modify: `index.css`

**Interfaces:**
- Consumes: scheduling API and time conversion from Task 5.
- Produces: schedule/cancel controls and public next-release display.

- [ ] **Step 1: Add a failing static integration assertion**

Add `tests/publishing-ui.test.ts` that reads the source files and asserts the editor imports `ScheduleChapterDialog`, the manage page contains a cancel-schedule action, and the story page renders `nextScheduledReleaseAt`.

- [ ] **Step 2: Run the UI assertion and verify RED**

Run: `node --test tests/publishing-ui.test.ts`

Expected: assertions fail because the scheduling UI is absent.

- [ ] **Step 3: Implement the dialog and page integrations**

The dialog uses `datetime-local`, shows the browser timezone, disables confirmation during requests, and keeps user input on errors. The editor opens it from a `Schedule` button. The manage page shows scheduled state and cancellation. The public story page shows only the earliest next-release date.

- [ ] **Step 4: Run tests, typecheck, and build**

Run: `npm test`

Expected: all frontend tests pass.

Run: `npm run typecheck`

Expected: typecheck succeeds.

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 5: Commit scheduling UI**

```bash
git add components/ScheduleChapterDialog.tsx pages/ChapterEditorPage.tsx pages/ManageChaptersPage.tsx pages/BookDetailsPage.tsx index.css tests/publishing-ui.test.ts
git commit -m "feat: add chapter scheduling experience"
```

### Task 7: Writer analytics frontend

**Files:**
- Modify: `types.ts`
- Modify: `api/client.ts`
- Create: `utils/writerAnalytics.ts`
- Create: `pages/WriterAnalyticsPage.tsx`
- Modify: `App.tsx`
- Modify: `index.css`
- Test: `tests/writerAnalytics.test.ts`

**Interfaces:**
- Consumes: `GET /api/writer/analytics` from Task 4.
- Produces: `getWriterAnalytics(bookId?: string): Promise<WriterAnalytics>`.
- Produces: `normalizeDailyTrend(points, days): DailyTrendPoint[]`.

- [ ] **Step 1: Write failing analytics utility tests**

```typescript
test('normalizeDailyTrend fills missing days with zero', () => {
  const result = normalizeDailyTrend([{ date: '2026-08-29', readers: 3, views: 4 }], 2, new Date('2026-08-29T12:00:00Z'));
  assert.deepEqual(result.map(point => point.readers), [0, 3]);
});

test('formatRate never emits NaN', () => {
  assert.equal(formatRate(Number.NaN), '0%');
});
```

- [ ] **Step 2: Run utility tests and verify RED**

Run: `node --test tests/writerAnalytics.test.ts`

Expected: tests fail because the utility does not exist.

- [ ] **Step 3: Add types, API client, utilities, and dashboard**

Replace the placeholder route with `WriterAnalyticsPage`. Render the story selector, four summary cards, fourteen bars with accessible labels, release markers, chapter funnel table, and referrer list. Provide loading, error, and no-reader states without inventing metrics.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: frontend tests pass.

Run: `npm run typecheck`

Expected: typecheck succeeds.

Run: `npm run build`

Expected: production build succeeds.

Run: `npm run check:bundle`

Expected: entry bundle check succeeds.

Run: `cd backend && mvn test`

Expected: backend suite passes.

- [ ] **Step 5: Commit the analytics dashboard**

```bash
git add types.ts api/client.ts utils/writerAnalytics.ts pages/WriterAnalyticsPage.tsx App.tsx index.css tests/writerAnalytics.test.ts
git commit -m "feat: add writer growth dashboard"
```
