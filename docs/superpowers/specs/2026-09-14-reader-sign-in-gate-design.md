# Reader Sign-In Gate Design

## Product decision

WordWeft will keep story discovery public while requiring readers to sign in before receiving a complete manuscript. A guest can browse the catalog, open a story page, inspect its chapter list, and read a meaningful preview of the first published chapter. The preview ends at a natural paragraph boundary with a sign-in prompt. Every later published chapter is visible in the chapter list but requires sign-in before any manuscript text is returned.

Access language must be neutral and must not imply a paid account. Locked chapters use `Sign in to read`. The preview boundary uses `Sign in to keep reading`. The two authentication choices are `Sign in` and `Create account`. The product must not use `Free account required` or similar payment-adjacent wording in this flow.

## Goals

- Convert engaged guest readers into identifiable WordWeft accounts after they have experienced the story.
- Preserve public catalog, genre, author, book, and chapter discovery.
- Prevent complete chapter text from being delivered to an unauthenticated browser through application or SEO APIs.
- Return a reader to the same chapter and reading position after email login, Google login, signup, or OTP verification.
- Keep the existing publication, story ownership, content-warning, and age-rating rules authoritative.
- Preserve canonical chapter URLs, public metadata, sitemaps, sharing, and useful search visibility.
- Measure the complete funnel from preview entry through resumed authenticated reading.

## Non-goals

- Paid subscriptions, coins, purchases, trials, or premium tiers.
- Per-author preview settings in the first release.
- Guest quotas based on cookies, IP addresses, or browser fingerprinting.
- Giving crawlers or social bots complete manuscripts that an ordinary guest cannot receive.
- Redesigning the authentication page beyond the context, labels, and return behavior needed by this flow.
- Author-only bypass links or friend links in the first release.

## Access states

The backend returns one of three access states for a requested published chapter:

- `FULL`: the current user may receive the complete chapter.
- `PREVIEW`: the guest may receive only the approved prefix of the first published chapter.
- `AUTH_REQUIRED`: the chapter exists and is published, but manuscript content requires authentication.

The access rules are:

| Viewer | First published chapter | Later published chapters | Draft or scheduled chapters |
|---|---|---|---|
| Guest, eligible all-ages or teen story | `PREVIEW` | `AUTH_REQUIRED` | Not disclosed |
| Guest, mature or adult story | Existing age restriction; no manuscript preview | Existing age restriction; no manuscript preview | Not disclosed |
| Signed-in eligible reader | `FULL` | `FULL` | Not disclosed |
| Story owner | `FULL` | `FULL` | `FULL` through owner/editor flows |
| Signed-in but age-ineligible reader | Existing content restriction | Existing content restriction | Not disclosed |

The backend determines the first published chapter from stored manuscript order after filtering out non-published chapters. It never trusts a client-provided chapter index or preview range.

## Preview policy

The preview is generated on the backend from the first published chapter:

- For chapters under 1,000 words, target 60 percent of the words.
- For chapters with at least 1,000 words, target 50 percent, clamped to a minimum of 600 words and a maximum of 1,200 words.
- End after the last complete top-level content block whose cumulative word count does not exceed the target. If one narrative paragraph alone exceeds the target, truncate that paragraph at a safe sentence boundary with a DOM-aware operation that preserves valid inline markup. Atomic structured blocks such as tables and images are included only when they fit before the boundary.
- Preserve valid sanitized HTML. Never cut inside a tag, sentence container, character mention, spoiler element, table, image caption, or other structured block.
- Never return the complete chapter as a `PREVIEW`, including when the chapter contains only one unusually large content block.
- Do not expose arbitrary offsets, ranges, or alternate preview windows in the public API. Repeated requests must return the same prefix.

The service computes the preview without changing stored chapter content. A future publishing workflow may persist a writer-selected preview boundary, but the initial release has one consistent platform policy and requires no data migration.

## Guest experience

### Catalog and book page

Catalog, search, genre, author, and book pages remain public. The book page continues to show title, cover, author, summary, warnings, genres, statistics, characters permitted by existing rules, and all published chapter titles.

The first published chapter is labeled `Preview`. Every later published chapter has a visible lock plus the text `Sign in to read`. The lock is never the only access cue. `Read from Start` opens the preview for a guest and the complete first chapter for a signed-in reader.

Selecting a locked chapter opens its canonical reader URL and displays the book title, chapter number, chapter title, and the sign-in gate. It does not render manuscript text and does not immediately redirect to an unexplained generic authentication page. The gate includes a link back to the first-chapter preview.

### First-chapter preview

The existing reader chrome, appearance controls, content warnings, share action, and responsive typography remain available while reading the preview. Progress describes progress through the visible preview and must not falsely report completion of the whole chapter.

At the preview boundary, an inline section replaces the ordinary end-of-chapter controls:

- Heading: `Sign in to keep reading`
- Supporting copy: `Sign in to finish this chapter and continue through the story. Your place will be kept for you.`
- Primary action: `Sign in`
- Secondary action: `Create account`
- Supporting benefits: saved reading position, personal library, and discussions

The gate is part of the document flow, not an overlay over hidden text. It does not use countdowns, artificial urgency, or blurred manuscript content. Later-chapter navigation and table-of-contents entries remain discoverable but expose the same `Sign in to read` state.

### Locked chapter

A direct guest visit to chapter two or later receives a contextual locked-reader screen at the canonical URL:

- Heading: `Sign in to read this chapter`
- Story and chapter title remain visible.
- Primary action: `Sign in`
- Secondary action: `Create account`
- Tertiary action: `Read the preview` when the first published chapter exists.

A locked chapter does not count as a chapter view or reading start.

## Authentication and return behavior

Authentication intent contains a validated same-origin return path and source metadata:

- `source`: `reader_preview_gate` or `locked_chapter`
- `bookId`
- `chapterId`
- `returnPath`
- the preview gate's scroll position when applicable
- requested authentication view: `login` or `signup`

The intent is stored in session storage so it survives Google redirects, OTP verification, refreshes, and movement between login and signup. A URL parameter may carry the requested authentication view, but an arbitrary external return URL is never accepted.

After successful authentication, WordWeft returns to the canonical chapter URL, requests full content, restores the saved scroll position, focuses the resumed reader region without unexpectedly moving keyboard users, and shows a restrained `You're signed in — keep reading` confirmation.

The current welcome journey must not interrupt reader-gate recovery. For a newly created account from this flow, mark onboarding as pending, resume the chapter first, and offer onboarding only after the reader leaves the chapter or reaches another safe transition. Normal signup outside the reader gate keeps the existing onboarding behavior.

If a session expires while navigating to another chapter, keep already rendered content in place, show `Your session expired. Sign in to continue`, and persist the same return intent.

## Backend architecture

### Book metadata

`GET /api/books/{bookId}` becomes a metadata response for every viewer. Published chapter entries include identifiers, titles, order, status appropriate to the viewer, word counts, warnings, statistics, and viewer-specific interaction flags, but not manuscript `content`.

Owner/editor flows also load chapter content through the focused chapter endpoint. This prevents the public book response from being a complete downloadable manuscript and avoids downloading every chapter when only one is being read or edited.

### Chapter content

Add `GET /api/books/{bookId}/chapters/{chapterId}/content` with optional authentication. Its successful response contains book/chapter identity, ordered published chapter metadata needed by the reader, `access`, `content`, and preview metadata when applicable.

- Guest first chapter: `200`, `access: PREVIEW`, preview HTML, preview word count, and complete chapter word count.
- Eligible signed-in reader: `200`, `access: FULL`, complete sanitized HTML.
- Guest later chapter: `401`, stable code `AUTH_REQUIRED`, and safe book/chapter metadata without manuscript content.
- Authenticated but age-ineligible reader: `403`, stable existing content-restriction code.
- Missing, unpublished, or unauthorized draft chapter: `404` to avoid disclosing private material.

The endpoint is permitted through the Spring security matcher so optional JWT authentication can populate the security context. A dedicated access service, not the controller or React client, decides which state and content are returned.

### Response and cache safety

- Public metadata and deterministic preview responses may use public caching with a short invalidation-aware lifetime.
- Full and viewer-specific responses use `Cache-Control: private, no-store` and vary correctly on authorization.
- Error responses never include manuscript content.
- Application logs and analytics payloads never include chapter text.
- The legacy public book response must stop serializing chapter content after all application consumers use the focused endpoint.

## Frontend architecture

- `BookDetailsPage` renders `Preview` and `Sign in to read` states from server-provided access metadata.
- `ReaderPage` loads book/chapter metadata and the selected chapter content separately, then renders `FULL`, `PREVIEW`, `AUTH_REQUIRED`, or content-restricted states explicitly.
- A focused `ReaderSignInGate` component owns the shared preview and locked-chapter copy and actions.
- `AuthPage` accepts the requested login/signup view and contextual reader copy without duplicating Google or email authentication logic.
- `App` owns validated, session-persisted authentication intent and post-authentication restoration.
- Chapter editors fetch one full owner-authorized chapter instead of depending on manuscript content embedded in a whole-book response.

Guest attempts to like, comment, report, save, or add a story to the library use the same authentication-intent mechanism and preserve the current chapter, but only the preview boundary and locked chapters are required to persist a reading scroll position.

## SEO and sharing

Public book and chapter canonical URLs remain unchanged. Book pages, chapter titles, authors, descriptions, warnings, and the permitted first-chapter excerpt remain crawlable. Sitemaps continue to list eligible published chapter URLs.

The public SEO service must use the same preview service and access policy as the interactive application. It must not attach complete chapter content to the public SEO response. A guest, a JavaScript-disabled browser, the HTML renderer, and an ordinary unauthenticated API client must receive the same manuscript excerpt or locked state.

Chapter structured data accurately indicates that the complete work requires registration, using applicable `CreativeWork` gated-content properties such as `isAccessibleForFree: false` and a marked gate section. Canonical, Open Graph, and social-card metadata remain public and contain no restricted manuscript text. Authentication and account routes remain `noindex`.

The release must verify that:

- no complete chapter sentinel appears in guest JSON or rendered HTML;
- first-chapter preview text is present in rendered HTML;
- later chapter HTML contains title and gate but no manuscript text;
- canonical URLs and chapter sitemap entries remain stable;
- the legacy fragment URLs still reach the corresponding clean URL state;
- crawler handling does not depend only on a claimed user-agent string.

Search Console impressions, clicks, indexed chapter count, and crawl errors are rollout guardrails. Full verified-crawler access is out of scope unless WordWeft later decides that indexing complete manuscripts is worth the additional security and policy complexity.

## Analytics

Track the conversion journey without chapter text or new identifying data:

- `reader_preview_started`
- `reader_preview_gate_viewed`
- `reader_gate_auth_clicked` with `login` or `signup`
- `locked_chapter_viewed`
- `reader_gate_auth_completed`
- `reader_full_content_resumed`
- `reader_next_chapter_started`

Record a gate impression at most once per book/chapter/browser session. Distinguish preview starts, complete authenticated chapter starts, and locked-page visits in writer analytics. A locked page is not a read. A preview may count as a preview view but must not inflate complete-reader or continuation metrics.

The primary product metric is the percentage of gate viewers who authenticate and resume full reading. Secondary measures are chapter-two continuation and returning-reader activity. Guardrails are preview abandonment, authentication failure, search traffic, chapter indexing, and author-facing read-count changes.

## Accessibility

- Locks have visible text and accessible names; color and icons are supplementary.
- Gate headings, supporting text, and actions have a logical reading order.
- The inline gate works at 200 percent zoom and through mobile reflow without covering manuscript text.
- Keyboard focus remains predictable when the gate appears, authentication opens, and reading resumes.
- Status confirmations use a polite live region without stealing focus.
- Authentication errors identify the field or action and preserve entered values.
- Reduced-motion preferences continue to apply.

Automated checks cannot establish full assistive-technology usability. Keyboard, screen-reader, zoom, contrast, and mobile touch-target checks are required in the browser verification pass.

## Error handling

- Preview-generation failure returns a safe gate with no complete content and is logged without manuscript text.
- A removed or unpublished chapter returns the existing not-found experience.
- An unavailable authentication provider leaves email authentication usable.
- A failed full-content request after login preserves the chapter and offers retry; it never silently falls back to a preview while claiming the user is signed in.
- Invalid or stale return intents fall back to the book page, not an external URL or unrelated route.
- Network loss at the preview boundary keeps the visible preview readable and the authentication actions retryable.

## Rollout and compatibility

The change is released behind a server-authoritative feature flag. A safe deployment sequence is:

1. Deploy the additive chapter-content endpoint, preview service, access DTOs, and metrics while preserving the old book response temporarily.
2. Deploy frontend consumers that use metadata plus the focused content endpoint for reading and editing.
3. Remove chapter content from the legacy book response, switch the SEO renderer to preview-only content, run leak checks, and enable the sign-in gate.
4. Monitor authentication completion, resumed reading, backend authorization errors, writer analytics, Search Console, and crawler failures before completing rollout.

Rollback disables the gate policy but does not restore complete manuscript content to the metadata endpoint; the focused chapter endpoint can return `FULL` to guests during rollback if necessary. This keeps application contracts stable.

Authors should receive a concise release notice explaining that story pages remain public, the first chapter supplies a preview, and readers sign in for complete chapters. Existing terms already permit previews and snippets, but final launch copy should still be checked against current Terms and Privacy language.

## Testing and acceptance

Backend tests cover preview boundary calculation, well-formed HTML, first-published-chapter selection, missing/draft handling, owners, eligible readers, age restrictions, anonymous later chapters, cache headers, and absence of manuscript content from metadata and errors.

Frontend tests cover chapter labels, preview rendering, gate copy, direct locked URLs, table-of-contents states, interaction gates, login/signup selection, OTP and Google-compatible return intent, onboarding deferral, session expiry, scroll restoration, and retry behavior.

SEO tests run with JavaScript disabled and verify preview-only HTML, locked later chapters, structured data, canonical URLs, legacy redirects, social metadata, sitemaps, and absence of full-content sentinel text.

The browser acceptance matrix includes guest, returning reader, new email account, Google account, story owner, mature-content eligible/ineligible users, desktop, mobile, light/dark/sepia reader themes, keyboard-only navigation, zoom, and reduced motion.

Production readiness requires all backend tests, frontend tests, TypeScript typecheck, production build, SEO tests, bundle check, guest API leak probes, and browser smoke tests to pass.
