# Holistic Flow Repair Design

## Product outcome

WordWeft should behave as one coherent publishing product rather than a collection of loosely connected screens. Imports must preserve manuscript media without invalidating authentication, writers must understand exactly what publishing changes, public readers must never receive working drafts, and every discovery/reading surface must remain usable on a narrow phone.

The implementation keeps the existing storage boundary: ImageKit remains responsible for covers, avatars, and character portraits; Cloudflare R2 remains responsible only for inline chapter images and Founding Writer manuscript files.

## Import contract

- Accept manuscript requests up to 25 MB, with a 5 MB limit for any embedded image and bounded image extraction.
- Reject invalid, unsupported, or oversized uploads with a structured validation response. Upload errors must never be routed through a protected generic error page or interpreted by the client as an expired session.
- Upload every supported embedded manuscript image through `ChapterImageStorageService` to Cloudflare R2. Never silently discard an image. If one or more images fail, fail the import safely and report the failed image count instead of creating a misleading text-only success.
- Return a structured import summary containing chapter count, embedded image count, uploaded image count, warnings, and suggested character names.
- Character suggestions are advisory. The review step lets the writer select candidates and create character records after import; no character is created without confirmation. Character portraits, if later added, continue to use ImageKit.
- Founding Writer submissions only succeed when the manuscript has actually reached R2. A missing worker URL or failed upload is an application failure, not a fabricated storage key.

## Authentication and error semantics

Every 401 response must carry a stable code. `SESSION_INVALID` means the presented credential is expired or invalid and may clear local authentication. `AUTH_REQUIRED` means the requested action requires sign-in and must preserve any currently valid session and page state. Validation, upload, access, and not-found failures must use their own non-401 status/code.

The frontend parses the response before deciding whether to clear authentication. Reader gates, community prompts, Hook Feed taste prompts, and upload validation cannot log the user out. Spring permits `/error`, and multipart errors are converted into a structured 413 or 400 response.

## Publication model

Each chapter has a working draft and an independently stored published snapshot. Autosave updates only the working title/content. Public readers, Hook Feed, public search metadata, community attachments, and SEO read only the published snapshot. Publishing atomically copies the working draft into the public snapshot.

Story and chapter changes go through one publication service so controllers, schedulers, and future callers cannot create contradictory state.

### Rules

| Action | Result |
|---|---|
| Publish a draft story | Show an ordered chapter checklist; require at least one complete chapter; publish the selected contiguous prefix atomically. |
| Select Chapter 3 for first publication | Chapters 1–3 are selected so the public story has no gaps. |
| Publish a chapter while its story is draft | Explain that the story and required preceding chapters will also become public, then perform one atomic publication. |
| Edit a published chapter | Autosave privately; readers continue to see the last published snapshot; the action becomes `Publish updates`. |
| Unpublish Chapter 2 | Unpublish Chapter 2 and every later chapter so public order stays contiguous. |
| Return a story to draft | Make the story private and cancel/unpublish every chapter publication state. |
| Schedule a chapter | Only the next valid chapter of a published story may be scheduled; execution revalidates the rule before publishing. |

The editor uses separate `saveState` and `publishState`. Autosave says `Saving…`/`Saved` near the editor status; it never changes `Publish` to `Publishing…`.

## Discovery and search experience

### Hook Feed

Hook Feed is a fast opening-lines sampler. On mobile, the story card fits the cover, short excerpt, attribution, and primary actions in the first viewport. Taste settings live in a compact bottom sheet opened by a working `Tune feed` control. Previously liked state is returned by the API, rapid repeated actions are disabled while pending, and optimistic updates fully roll back on failure.

Copy is direct and editorial rather than synthetic: the surface is titled `Find your next read`, with plain explanations of what the controls do. Decorative sparkle language and oversized introductory blocks are removed.

### Home

The logged-out hero leads with `Read stories. Write your own.` The signed-in discovery hero leads with `Find something worth reading.` Calls to action name the destination or action directly. Decorative effects are restrained and every CTA performs the advertised navigation.

Horizontal shelves use scroll snapping, safe edge padding, and card widths that never clip the final card on iOS. Overflow is intentional and discoverable rather than hidden by the viewport.

### Search

Search supports case-insensitive partial-name and title prefixes, plus typo-tolerant fallback. MongoDB Atlas search remains useful where configured, while a bounded normalized prefix fallback keeps autocomplete correct for inputs such as `Sri` matching `Srijib`. Counts are computed after access filtering. Results use the WordWeft neutral/brown palette, semantic links/buttons, an accessible dialog, visible errors, keyboard focus management, and useful empty states.

## Reading experience

- The default `Everyone` age marker is omitted. Restricted ratings remain visible with clear text.
- Reader appearance and discovery cues use viewport-relative placement, safe-area insets, and a mobile bottom sheet. They cannot render offscreen or cover navigation/content.
- On pointer devices, the paragraph comment control appears on hover or keyboard focus. On touch devices, tapping a paragraph reveals one contextual comment action; rows of permanent plus buttons never overlap prose.
- Public chapter content always comes from the published snapshot. Owners editing a chapter receive the working draft through owner-authorized endpoints.

## Responsive and accessibility requirements

All changed flows are verified at narrow mobile, tablet, laptop, and desktop widths. Touch targets are at least 44 px, dialogs trap and restore focus, status changes use polite live regions, controls have visible labels, horizontal content does not cause body overflow, and reduced-motion preferences remain respected.

## Verification strategy

- Backend unit/controller tests cover multipart limits, image-upload failure, auth codes, publication transitions, snapshot isolation, scheduler revalidation, and Founding Writer storage failure.
- Frontend tests cover auth invalidation classification, autosave/publish labels, publication selection rules, age-badge omission, search prefix results/error states, Hook Feed action safety, and responsive interaction state.
- Browser verification exercises logged-out and logged-in home/search/reader flows, import success and failure, publication from story and chapter screens, mobile Hook Feed, reader cues, and paragraph comments.
- Production configuration is documented so Vercel, Render, and Cloudflare variables are explicit and storage responsibilities remain unchanged.

## Delivery sequence

1. Stabilize response/error semantics and import storage behavior.
2. Add published chapter snapshots and central publication commands, then migrate every public consumer.
3. Update writer publication/import review UI.
4. Rework Hook Feed, home, search, reader cues, comments, ratings, and mobile shelves.
5. Run automated suites, start both local services on LAN-accessible bindings, and complete desktop/mobile browser verification.
