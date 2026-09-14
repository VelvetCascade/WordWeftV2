# Reader Sign-In Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let guests read an SEO-visible preview of the first published chapter while requiring sign-in for the rest of that chapter and every later chapter, without leaking full manuscripts through public APIs.

**Architecture:** Split public book metadata from focused chapter content. A backend access service returns `PREVIEW`, `FULL`, or `AUTH_REQUIRED`; React renders those states and persists a same-origin authentication return intent. The public SEO renderer consumes the same preview projection, while anonymous analytics records the gate funnel without manuscript text.

**Tech Stack:** Java 17, Spring Boot 3.2, Spring Security, MongoDB, Jsoup, React 19, TypeScript 5.8, Vite 6, Node test runner, server-rendered SEO modules.

**Spec:** `docs/superpowers/specs/2026-09-14-reader-sign-in-gate-design.md`

## Global Constraints

- Locked-chapter copy is exactly `Sign in to read`; the preview heading is exactly `Sign in to keep reading`.
- Authentication actions are `Sign in` and `Create account`; do not display `Free account required`.
- A guest may receive only a deterministic prefix of the first published chapter and no text from later chapters.
- Never cut preview HTML inside a tag or return complete chapter text as `PREVIEW`.
- Mature/adult access, publication state, and story ownership remain authoritative.
- Canonical chapter URLs and sitemap paths remain unchanged.
- Guest, JavaScript-disabled, SEO renderer, and anonymous API clients receive the same preview or locked state.
- Full chapter responses are `private, no-store`; logs and analytics never include manuscript text.

---

### Task 1: Backend preview generation

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/wordweft/book/service/ChapterPreviewService.java`
- Test: `backend/src/test/java/com/wordweft/book/service/ChapterPreviewServiceTest.java`

**Interfaces:**
- Consumes: stored sanitized chapter HTML and the chapter word count.
- Produces: `ChapterPreviewService.Preview preview(String html)` where `Preview` contains `html`, `previewWordCount`, and `fullWordCount`.

- [ ] **Step 1: Write failing preview tests**

```java
@Test void usesSixtyPercentForShortChaptersAndNeverReturnsEverything() {
    String html = paragraphs(800);
    Preview preview = service.preview(html);
    assertTrue(preview.previewWordCount() >= 450);
    assertTrue(preview.previewWordCount() < preview.fullWordCount());
    assertFalse(preview.html().contains("WORD_799"));
}

@Test void clampsLongChaptersAndKeepsHtmlWellFormed() {
    Preview preview = service.preview("<p><strong>" + words(3000) + "</strong></p>");
    assertTrue(preview.previewWordCount() <= 1200);
    assertDoesNotThrow(() -> Jsoup.parseBodyFragment(preview.html()));
    assertNotEquals(words(3000), Jsoup.parse(preview.html()).text());
}

@Test void omitsScriptsAndDoesNotSplitAtomicBlocks() {
    Preview preview = service.preview("<script>SECRET</script><p>" + words(700) + "</p><table><tr><td>TABLE_SECRET</td></tr></table>");
    assertFalse(preview.html().contains("SECRET"));
    assertFalse(preview.html().contains("TABLE_SECRET"));
}
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `mvn -q -Dtest=ChapterPreviewServiceTest test` from `backend`.
Expected: FAIL because `ChapterPreviewService` does not exist.

- [ ] **Step 3: Add Jsoup and implement deterministic DOM-aware truncation**

```java
@Service
public class ChapterPreviewService {
    public record Preview(String html, int previewWordCount, int fullWordCount) {}

    public Preview preview(String html) {
        Document source = Jsoup.parseBodyFragment(Objects.requireNonNullElse(html, ""));
        source.select("script,style,iframe,object,embed").remove();
        int fullWords = words(source.body().text());
        int target = fullWords < 1000
                ? Math.max(1, (int) Math.floor(fullWords * .60))
                : Math.min(1200, Math.max(600, fullWords / 2));
        Element output = new Element("div");
        copyWithinBudget(source.body(), output, new WordBudget(Math.min(target, Math.max(0, fullWords - 1))));
        return new Preview(output.html(), words(output.text()), fullWords);
    }
}
```

`copyWithinBudget` must clone allowed elements and attributes, trim text nodes only at word/sentence boundaries, omit atomic blocks that do not fit, append an ellipsis to a truncated text node, and stop before the budget can equal the full chapter.

- [ ] **Step 4: Run the preview tests**

Run: `mvn -q -Dtest=ChapterPreviewServiceTest test` from `backend`.
Expected: PASS.

- [ ] **Step 5: Commit the preview service**

```bash
git add backend/pom.xml backend/src/main/java/com/wordweft/book/service/ChapterPreviewService.java backend/src/test/java/com/wordweft/book/service/ChapterPreviewServiceTest.java
git commit -m "feat: generate safe chapter previews"
```

### Task 2: Metadata-only book responses and chapter access policy

**Files:**
- Create: `backend/src/main/java/com/wordweft/book/dto/ChapterContentResponse.java`
- Create: `backend/src/main/java/com/wordweft/book/service/ChapterContentService.java`
- Modify: `backend/src/main/java/com/wordweft/book/service/BookService.java`
- Modify: `backend/src/main/java/com/wordweft/book/controller/BookController.java`
- Modify: `backend/src/main/java/com/wordweft/config/SecurityConfig.java`
- Test: `backend/src/test/java/com/wordweft/book/service/ChapterContentServiceTest.java`
- Test: `backend/src/test/java/com/wordweft/book/service/BookServiceDraftAccessTest.java`
- Test: `backend/src/test/java/com/wordweft/book/controller/ChapterContentControllerTest.java`

**Interfaces:**
- Consumes: `ChapterPreviewService`, `ContentAccessService`, `BookRepository`, and optional authenticated user ID.
- Produces: `ChapterContentResponse load(String bookId, String chapterId)` with access `FULL` or `PREVIEW`; `AuthRequiredException` for a guest later chapter.
- Produces: `GET /api/books/{bookId}/chapters/{chapterId}/content`.

- [ ] **Step 1: Write failing service and controller tests**

```java
@Test void guestGetsOnlyFirstPublishedPreview() {
    ChapterContentResponse response = service.load("book", "first");
    assertEquals(ChapterAccess.PREVIEW, response.access());
    assertFalse(response.content().contains("FIRST_END_SECRET"));
}

@Test void guestCannotRequestLaterChapterText() {
    assertThrows(AuthRequiredException.class, () -> service.load("book", "second"));
}

@Test void signedInEligibleReaderGetsFullText() {
    authenticate("reader");
    assertEquals("SECOND_FULL", service.load("book", "second").content());
}

@Test void publicBookProjectionContainsNoChapterContent() {
    Map<String,Object> dto = service.getBookById("book", false);
    assertFalse(dto.toString().contains("FIRST_END_SECRET"));
    assertFalse(((Map<?,?>)((List<?>)dto.get("chapters")).get(0)).containsKey("content"));
}
```

Controller tests expect `200` with `PREVIEW`, `401` with `errorCode: AUTH_REQUIRED`, `200` plus `private, no-store` for an authenticated reader, `403` for age restriction, and `404` for draft/nonexistent content.

- [ ] **Step 2: Run focused backend tests and confirm failure**

Run: `mvn -q -Dtest=ChapterContentServiceTest,ChapterContentControllerTest,BookServiceDraftAccessTest test` from `backend`.
Expected: FAIL because the access response and endpoint do not exist and book responses still contain content.

- [ ] **Step 3: Implement response records and access service**

```java
public record ChapterContentResponse(
        String bookId, String bookTitle, String chapterId, String chapterTitle,
        int chapterIndex, ChapterAccess access, String content,
        int previewWordCount, int fullWordCount) {
    public enum ChapterAccess { FULL, PREVIEW }
}
```

`ChapterContentService.load` must load the book once, hide unpublished books/chapters from non-owners, call the existing age-access policy, select the first published chapter by stored order, return a preview only for that chapter when no user is authenticated, throw `AuthRequiredException` for later chapters, and return full text for eligible authenticated readers and owners.

- [ ] **Step 4: Remove `content` from `BookService.enrichBook` chapter maps**

Keep chapter metadata and viewer-specific interaction fields. Add `accessLabel` values `PREVIEW`, `SIGN_IN`, or `FULL` so the book page does not reproduce access policy from indexes.

- [ ] **Step 5: Add endpoint, stable error handling, and cache headers**

```java
@GetMapping("/{bookId}/chapters/{chapterId}/content")
public ResponseEntity<ChapterContentResponse> getChapterContent(...) {
    ChapterContentResponse body = chapterContentService.load(bookId, chapterId);
    CacheControl cache = body.access() == ChapterAccess.FULL
            ? CacheControl.noStore()
            : CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic();
    return ResponseEntity.ok().cacheControl(cache).body(body);
}
```

Add a global handler returning `401` and `{ "errorCode": "AUTH_REQUIRED", "message": "Sign in to read this chapter." }`. Leave the content GET under optional-auth public matching; the service remains authoritative.

- [ ] **Step 6: Run focused and complete backend tests**

Run: `mvn -q -Dtest=ChapterPreviewServiceTest,ChapterContentServiceTest,ChapterContentControllerTest,BookServiceDraftAccessTest test` then `mvn -q test` from `backend`.
Expected: PASS.

- [ ] **Step 7: Commit backend access control**

```bash
git add backend/src/main/java/com/wordweft/book backend/src/main/java/com/wordweft/config/SecurityConfig.java backend/src/main/java/com/wordweft/exception backend/src/test/java/com/wordweft/book
git commit -m "feat: require sign in for full chapter content"
```

### Task 3: Frontend access types, client, and authentication intent

**Files:**
- Modify: `types.ts`
- Modify: `api/client.ts`
- Create: `utils/readerAuthIntent.ts`
- Create: `tests/readerAuthIntent.test.ts`
- Create: `tests/readerAccess.test.ts`

**Interfaces:**
- Consumes: backend `ChapterContentResponse` and session storage.
- Produces: `getChapterContent(bookId, chapterId): Promise<ChapterContentResult>` where result access is `FULL`, `PREVIEW`, or `AUTH_REQUIRED`.
- Produces: `saveReaderAuthIntent`, `readReaderAuthIntent`, `markReaderAuthComplete`, and `consumeReaderResumeIntent`.

- [ ] **Step 1: Write failing pure tests for access mapping and return-path validation**

```ts
test('rejects external and unrelated return paths', () => {
  assert.equal(createReaderAuthIntent({ returnPath: 'https://evil.test', bookId: 'b', chapterId: 'c' }), null);
  assert.equal(createReaderAuthIntent({ returnPath: '/profile', bookId: 'b', chapterId: 'c' }), null);
});

test('accepts the matching canonical chapter path and expires stale intent', () => {
  const intent = createReaderAuthIntent({ returnPath: '/book/b/chapter/c', bookId: 'b', chapterId: 'c', now: 1000 });
  assert.equal(intent?.returnPath, '/book/b/chapter/c');
  assert.equal(isReaderAuthIntentFresh(intent!, 1000 + 29 * 60_000), true);
  assert.equal(isReaderAuthIntentFresh(intent!, 1000 + 31 * 60_000), false);
});
```

- [ ] **Step 2: Run the frontend tests and confirm failure**

Run: `npm test`.
Expected: FAIL because the intent helpers and chapter access types do not exist.

- [ ] **Step 3: Add frontend types and safe client mapping**

```ts
export type ChapterAccess = 'FULL' | 'PREVIEW' | 'AUTH_REQUIRED';
export interface ChapterContentResult {
  bookId: string; bookTitle: string; chapterId: string; chapterTitle: string;
  chapterIndex: number; access: ChapterAccess; content: string;
  previewWordCount: number; fullWordCount: number;
}
```

Map missing chapter `content` to `''`. `getChapterContent` parses a `401` JSON body into an `AUTH_REQUIRED` result rather than throwing, while other failures remain errors.

- [ ] **Step 4: Implement expiring same-origin reader intent helpers**

Use session key `ww_reader_auth_intent`, a 30-minute lifetime, exact encoded book/chapter segments, `source`, `authView`, `scrollY`, `createdAt`, and `completed`. Never persist email, tokens, chapter text, or external URLs.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `npm test && npm run typecheck`.
Expected: PASS.

```bash
git add types.ts api/client.ts utils/readerAuthIntent.ts tests/readerAuthIntent.test.ts tests/readerAccess.test.ts
git commit -m "feat: add reader access client state"
```

### Task 4: Story-page labels and reader gate states

**Files:**
- Create: `components/ReaderSignInGate.tsx`
- Modify: `pages/BookDetailsPage.tsx`
- Modify: `pages/ReaderPage.tsx`
- Modify: `index.css`
- Modify: `tests/readerAccess.test.ts`

**Interfaces:**
- Consumes: `Chapter.accessLabel`, `ChapterContentResult`, and `saveReaderAuthIntent`.
- Produces: visible `Preview`, `Sign in to read`, `Sign in to keep reading`, and contextual locked-chapter states.

- [ ] **Step 1: Add failing source-contract tests**

Assert that the story page renders `Preview` and `Sign in to read`, the shared gate renders the approved headings/buttons, ReaderPage calls `getChapterContent`, and no gate copy contains `Free account required`.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test`.
Expected: FAIL on the missing component and old embedded-content reader flow.

- [ ] **Step 3: Implement `ReaderSignInGate`**

```tsx
<section className="reader-sign-in-gate" aria-labelledby={headingId}>
  <Lock aria-hidden="true" />
  <h2 id={headingId}>{locked ? 'Sign in to read this chapter' : 'Sign in to keep reading'}</h2>
  <p>{locked ? `Continue ${bookTitle} by signing in.` : 'Sign in to finish this chapter and continue through the story. Your place will be kept for you.'}</p>
  <button onClick={() => onAuthenticate('login')}>Sign in</button>
  <button onClick={() => onAuthenticate('signup')}>Create account</button>
  {locked && <button onClick={onReadPreview}>Read the preview</button>}
</section>
```

- [ ] **Step 4: Update story chapter rows**

Render a text label and accessible name for every access state. Guests may open canonical later-chapter URLs, but the row and arrow say `Sign in to read`. Signed-in readers keep normal `Read` behavior.

- [ ] **Step 5: Refactor ReaderPage around selected chapter content**

Fetch metadata and selected content, place returned content only on the selected chapter, and render:

- normal manuscript and chapter-end controls for `FULL`;
- preview manuscript followed by the shared gate for `PREVIEW`;
- title plus contextual gate and `Read the preview` for `AUTH_REQUIRED`.

Do not request comments, record a full chapter view, save reading progress, or enable next/previous manuscript navigation for `AUTH_REQUIRED`. For `PREVIEW`, record preview analytics but not complete progress. Table-of-contents and dock buttons open contextual gates for locked chapters.

- [ ] **Step 6: Add responsive, theme-aware, focus-visible gate styling**

The gate remains inline, reflows at 320 CSS pixels, supports light/dark/sepia reader themes, uses text in addition to the lock icon, and has 44-pixel actions and visible keyboard focus.

- [ ] **Step 7: Run tests, typecheck, and build**

Run: `npm test && npm run typecheck && npm run build`.
Expected: PASS.

- [ ] **Step 8: Commit the reader UI**

```bash
git add components/ReaderSignInGate.tsx pages/BookDetailsPage.tsx pages/ReaderPage.tsx index.css tests/readerAccess.test.ts
git commit -m "feat: add contextual reader sign-in gates"
```

### Task 5: Authentication restoration and deferred onboarding

**Files:**
- Modify: `App.tsx`
- Modify: `pages/AuthPage.tsx`
- Modify: `pages/ReaderPage.tsx`
- Modify: `utils/readerAuthIntent.ts`
- Modify: `tests/readerAuthIntent.test.ts`
- Modify: `tests/readerAccess.test.ts`

**Interfaces:**
- Consumes: the reader intent helpers from Task 3.
- Produces: login/signup entry selection, exact post-auth route restoration, scroll restoration, and reader-first onboarding deferral.

- [ ] **Step 1: Add failing flow-contract tests**

Assert that AuthPage accepts `initialView`, App checks reader intent before ordinary onboarding, successful gate authentication marks the intent complete and returns to its chapter, and ReaderPage consumes only a matching completed intent.

- [ ] **Step 2: Run tests and confirm failure**

Run: `npm test`.
Expected: FAIL on missing auth-context behavior.

- [ ] **Step 3: Support contextual authentication views**

`AuthPage` receives `initialView: 'login' | 'signup'`, initializes its view from that value, and preserves normal switching, Google login, email signup, and OTP behavior.

- [ ] **Step 4: Restore the chapter before onboarding**

In `handleLogin`, read a fresh reader intent before checking `ww_welcomeJourneyCompleted`. Mark it complete, set `ww_welcomeJourneyPending` for a new user, and navigate to its validated chapter path. On the first non-reader/non-auth page, show the pending welcome journey once.

- [ ] **Step 5: Restore scroll and announce success**

After matching `FULL` content renders, ReaderPage restores the stored `scrollY`, clears the intent, and displays `You're signed in — keep reading` in a polite live region. A stale or mismatched intent is cleared safely.

- [ ] **Step 6: Run tests, typecheck, and commit**

Run: `npm test && npm run typecheck`.
Expected: PASS.

```bash
git add App.tsx pages/AuthPage.tsx pages/ReaderPage.tsx utils/readerAuthIntent.ts tests/readerAuthIntent.test.ts tests/readerAccess.test.ts
git commit -m "feat: resume reading after authentication"
```

### Task 6: SEO preview parity and gated structured data

**Files:**
- Modify: `backend/src/main/java/com/wordweft/seo/PublicSeoService.java`
- Modify: `backend/src/test/java/com/wordweft/seo/PublicSeoServiceTest.java`
- Modify: `seo/render.mjs`
- Modify: `seo/metadata.mjs`
- Modify: `tests/seo.test.mjs`

**Interfaces:**
- Consumes: `ChapterPreviewService.Preview` and SEO book projection.
- Produces: first-chapter excerpt HTML, later-chapter sign-in HTML, and `isAccessibleForFree: false` chapter schema without full manuscript leakage.

- [ ] **Step 1: Write failing backend and Node SEO tests**

Backend assertions require first-chapter `PREVIEW`, later-chapter `AUTH_REQUIRED`, and absence of end-of-chapter sentinel text from `book(id, chapterId)`. Node assertions require approved gate copy, stable canonicals/sitemap links, gated schema, and no sentinel in rendered HTML.

- [ ] **Step 2: Run SEO tests and confirm failure**

Run: `mvn -q -Dtest=PublicSeoServiceTest test` from `backend`, then `npm run test:seo` from the repository root.
Expected: FAIL because SEO currently receives and renders complete chapter content.

- [ ] **Step 3: Inject and use the shared preview service in PublicSeoService**

The book projection never includes draft/scheduled text. With a chapter ID, add preview content only for the first published chapter; add `access: AUTH_REQUIRED` and no `content` for later chapters.

- [ ] **Step 4: Render SEO preview and locked states**

The first chapter renders its excerpt plus `Sign in to keep reading`. Later chapters render title, description, `Sign in to read this chapter`, `Sign in`, `Create account`, and a link to the first preview. Keep previous/all/next chapter links and canonical paths.

- [ ] **Step 5: Mark chapter schema honestly**

Add `isAccessibleForFree: false` and a `hasPart` `WebPageElement` pointing at `.reader-sign-in-gate` to the chapter entity. Book metadata and Open Graph descriptions remain public and do not use restricted chapter text.

- [ ] **Step 6: Run backend and SEO suites**

Run: `mvn -q test` from `backend`, then `npm run test:seo && npm run build` from the root.
Expected: PASS.

- [ ] **Step 7: Commit SEO parity**

```bash
git add backend/src/main/java/com/wordweft/seo backend/src/test/java/com/wordweft/seo seo tests/seo.test.mjs
git commit -m "feat: keep gated chapters discoverable"
```

### Task 7: Anonymous-safe gate analytics

**Files:**
- Modify: `utils/analyticsService.ts`
- Modify: `pages/ReaderPage.tsx`
- Modify: `App.tsx`
- Modify: `backend/src/main/java/com/wordweft/analytics/controller/AnalyticsController.java`
- Modify: `backend/src/main/java/com/wordweft/analytics/service/AnalyticsService.java`
- Modify: `backend/src/main/java/com/wordweft/config/SecurityConfig.java`
- Create: `backend/src/test/java/com/wordweft/analytics/controller/AnalyticsControllerTest.java`
- Modify: `tests/readerAccess.test.ts`

**Interfaces:**
- Consumes: existing analytics batches and optional JWT principal.
- Produces: anonymous gate events with `Anonymous` identity and authenticated completion/resume events.

- [ ] **Step 1: Write failing analytics tests**

Controller tests post a bounded anonymous batch successfully and reject more than 20 events. Source tests assert the seven approved gate action names and verify that no content field enters metadata.

- [ ] **Step 2: Run tests and confirm failure**

Run: `mvn -q -Dtest=AnalyticsControllerTest test` from `backend`, then `npm test`.
Expected: FAIL because analytics currently dereferences a missing principal and SecurityConfig requires authentication.

- [ ] **Step 3: Make analytics ingestion anonymous-safe and bounded**

Permit only `POST /api/analytics/events`. When no principal exists, use `anonymous`, `Anonymous`, and an empty email; accept at most 20 events and reject categories/actions/labels over fixed lengths. The existing rate-limit interceptor remains active.

- [ ] **Step 4: Send anonymous batches without PII**

Remove the frontend early return that discards guest analytics. Gate metadata contains only book ID, chapter ID, chapter index, access state, and auth choice. Never include title, email, selected text, or manuscript text.

- [ ] **Step 5: Track the funnel**

Emit `reader_preview_started`, `reader_preview_gate_viewed`, `reader_gate_auth_clicked`, `locked_chapter_viewed`, `reader_gate_auth_completed`, `reader_full_content_resumed`, and `reader_next_chapter_started`. Deduplicate gate impressions per chapter/session.

- [ ] **Step 6: Run tests and commit**

Run: `mvn -q test` from `backend`, then `npm test && npm run typecheck`.
Expected: PASS.

```bash
git add utils/analyticsService.ts pages/ReaderPage.tsx App.tsx backend/src/main/java/com/wordweft/analytics backend/src/main/java/com/wordweft/config/SecurityConfig.java backend/src/test/java/com/wordweft/analytics tests/readerAccess.test.ts
git commit -m "feat: measure reader gate conversion"
```

### Task 8: Full regression, browser acceptance, and launch documentation

**Files:**
- Modify: `.env.example`
- Modify: `docs/SEO-LAUNCH.md`
- Create: `docs/READER-SIGN-IN-GATE.md`
- Modify: `tests/platformQuality.test.ts`

**Interfaces:**
- Consumes: completed backend, frontend, auth, analytics, and SEO behavior.
- Produces: verified release configuration and operational documentation.

- [ ] **Step 1: Add configuration and documentation checks**

Document `READER_SIGN_IN_GATE_ENABLED`, deployment order, rollback behavior, exact reader copy, API leak probes, Search Console guardrails, and the author-facing release explanation. Add a source test that requires the feature flag and forbids `Free account required` outside the design explanation.

- [ ] **Step 2: Run all automated verification**

Run from the repository root:

```text
npm test
npm run typecheck
npm run build
npm run check:bundle
npm run test:seo
```

Run from `backend`:

```text
mvn -q test
mvn -q package -DskipTests
```

Expected: every command exits 0.

- [ ] **Step 3: Run guest leak probes against the local backend**

Verify that the public book response and a later-chapter response do not contain known sentinel text, the first chapter contains only its prefix, and an authenticated fixture receives the full text. Verify `Cache-Control` for preview and full states.

- [ ] **Step 4: Browser-test the complete journey**

At desktop and mobile widths, verify guest book labels, first preview, preview boundary, direct locked chapter, sign-in and create-account entry, returning-account resume, onboarding deferral, chapter-two reading, light/dark/sepia themes, keyboard navigation, 200-percent zoom, and JavaScript-disabled SEO HTML. Inspect screenshots before accepting each state.

- [ ] **Step 5: Review the diff and commit release documentation**

Run: `git diff --check` and inspect `git status --short` for unrelated changes.

```bash
git add .env.example docs/SEO-LAUNCH.md docs/READER-SIGN-IN-GATE.md tests/platformQuality.test.ts
git commit -m "docs: document reader sign-in gate rollout"
```

- [ ] **Step 6: Perform final verification after the last commit**

Repeat `npm test`, `npm run typecheck`, `npm run build`, `npm run check:bundle`, `npm run test:seo`, and `mvn -q test`. Record exact totals and any environment-only verification gaps in the handoff.
