# Reader sign-in gate: release and operations guide

Implemented September 14, 2026. This change lets a visitor sample a story before asking them to identify themselves, while making a WordWeft account the boundary for continued reading.

## Reader experience

- A signed-out visitor sees every published chapter title on the story page. The first published chapter is labelled `Preview`; every later one is labelled `Sign in to read`.
- The first published chapter returns a deterministic HTML-safe excerpt. Chapters under 1,000 words use up to 60 percent; longer chapters use half, with a 600-word floor and a 1,200-word ceiling. At least one word is withheld, and atomic blocks such as tables, figures, code, audio, and video are never cut in half.
- The excerpt ends with `Sign in to keep reading`, followed by `Sign in` and `Create account` actions. A direct visit to a later chapter shows `Sign in to read this chapter` and can return to the first preview.
- After email or Google authentication, the reader returns to the exact canonical chapter and saved scroll position. New-reader onboarding is deferred until they leave the restored reading flow.
- Signed-in eligible readers receive the complete chapter. Existing draft, scheduled-publication, ownership, and mature-content rules remain authoritative.

This is an account gate, not a paywall. Do not describe it as a free plan, subscription, purchase, or payment requirement.

## Content and API boundary

`GET /api/books/{bookId}` contains chapter metadata only. It never embeds chapter manuscript HTML. The reader obtains the selected chapter from:

```text
GET /api/books/{bookId}/chapters/{chapterId}/content
```

For an anonymous request, the first published chapter returns `PREVIEW`; later published chapters return HTTP 401 with `errorCode: AUTH_REQUIRED`. An eligible authenticated request returns `FULL`. Preview responses may be publicly cached for five minutes; complete responses send `Cache-Control: private, no-store`.

The public SEO projection applies the same safe excerpt algorithm. First-chapter HTML contains only the excerpt and gate; later-chapter HTML contains public metadata and gate actions but no manuscript text. Canonical chapter URLs and sitemap entries remain unchanged. Chapter structured data states `isAccessibleForFree: false` and identifies the visible gate. Crawlers are never given content that an ordinary signed-out reader cannot receive.

## Analytics and privacy

The funnel records preview start, gate impression, authentication click, locked-chapter view, authentication completion, full-content resume, and next-chapter start. Guest batches use the identity `anonymous` / `Anonymous` with an empty email. Metadata is limited to short scalar identifiers and state values: book ID, chapter ID, chapter index, access state, and auth choice. Titles, email addresses, selected text, tokens, and manuscript text are excluded.

The public ingestion route accepts no more than 20 validated events per batch and remains behind the existing request-rate limiter. Unload beacons are anonymous; JWTs are never placed in a query string.

## Deployment and rollback

1. Deploy the backend first with `READER_SIGN_IN_GATE_ENABLED=true` and verify its health.
2. Run the anonymous API probes below against that backend.
3. Deploy the frontend/SEO build and test both authentication choices on the preview deployment.
4. Confirm production canonical, robots, sitemap, and chapter HTML before requesting indexing.

The backend defaults the flag to `true`; normal releases should also set it explicitly. If authentication is broadly unavailable and readers must be restored urgently, an incident owner may set `READER_SIGN_IN_GATE_ENABLED=false` and restart the backend. That temporarily restores legacy full reading through the interactive chapter endpoint and story labels, so treat it as a deliberate content-exposure rollback, record the incident, and restore `true` as soon as sign-in recovers. The server-rendered SEO surface remains gated. A code rollback must deploy the frontend first and backend second so a gated client never depends on an endpoint that has already been removed.

## Anonymous leak probes

Choose a published test story with distinctive harmless sentinel strings near the end of chapter one and anywhere in chapter two. Never run these probes with production secrets in shell history.

```sh
curl -i "$API/api/books/$BOOK_ID"
curl -i "$API/api/books/$BOOK_ID/chapters/$FIRST_CHAPTER_ID/content"
curl -i "$API/api/books/$BOOK_ID/chapters/$SECOND_CHAPTER_ID/content"
curl -i "$SITE/book/$BOOK_ID/chapter/$SECOND_CHAPTER_ID"
```

Expected results:

- book metadata contains neither sentinel and no chapter `content` field;
- chapter one is HTTP 200 with `access: PREVIEW`, omits the ending sentinel, and never returns the complete text;
- chapter two is HTTP 401 with `AUTH_REQUIRED` and omits its sentinel;
- server-rendered chapter two is HTTP 200 for discoverability, includes `Sign in to read this chapter`, and omits manuscript text;
- an authenticated chapter request returns `FULL` and `Cache-Control: private, no-store`.

## Manual acceptance checklist

Check desktop, a 320-pixel mobile viewport, 200-percent zoom, and keyboard-only navigation:

- story page labels and accessible names are correct;
- first preview has a clean, valid boundary in light, dark, and sepia reader themes;
- a later chapter opened from the table of contents or direct URL shows its contextual gate;
- both `Sign in` and `Create account` open the intended authentication view;
- successful authentication restores the exact chapter and scroll position with the polite resume announcement;
- a new reader can continue immediately and sees onboarding only after leaving the reading flow;
- chapter comments, full-view counting, progress saving, and next-chapter reading do not activate for locked content;
- JavaScript-disabled HTML contains the same preview/gate policy, correct canonical, and no locked text;
- no horizontal overflow appears and all actions retain visible focus.

## Search and release monitoring

Do not remove locked chapter URLs from sitemaps: their public title, synopsis context, author, navigation, and honest access schema remain useful discovery pages. In Search Console, inspect a first chapter and later chapter with Live Test after deployment. If any locked text appears in rendered HTML, unpublish the affected release or roll the frontend/SEO renderer back immediately; do not use `robots.txt` as a substitute for removing leaked content.

Monitor the reader-gate events as a funnel rather than optimizing only for account creation. Compare preview starts, gate views, authentication clicks, completed authentication, resumed reading, and chapter-two starts. A high authentication completion rate with a low resume rate indicates restoration trouble; a high gate-view rate with few clicks indicates copy, timing, or trust friction.

Author-facing release explanation: visitors can now sample the beginning of a story, search engines can still discover published story and chapter pages, and readers sign in before continuing. This gives authors identifiable readership without describing access as paid or exposing complete chapter text to anonymous clients.
