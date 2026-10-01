# WordWeft design revision 02

Prepared for review on 1 October 2026. This revision contains the same 60 named screens and states, each with desktop and mobile views: 120 individual images. It responds to the request for a confident, distinctive application while preserving the supplied home, account, search and story-detail directions. The existing reference document and the first design pack remain unchanged.

## The design direction

WordWeft should feel like a carefully edited place for stories and a dependable tool for writing them. Discovery uses bold type, asymmetrical story presentations and existing artwork. Reading is quieter, with the text taking priority. Creation uses a separate studio surface, a clear manuscript structure and visible saved-work feedback. Community gives people context for conversations, rather than an undifferentiated wall of posts.

The strongest supplied details are explicitly restored: the light Stories lettering on its irregular dark shape, the supplied hero covers and underline, the open account forms with a 30% artwork strip, the colourful search covers, and the connected gold chapter timeline. These details form the visual foundation rather than being replaced by a generic component library.

## Colour has a job

| Role | Colour | Use |
| --- | --- | --- |
| Paper | #FBFAF7 | Reading, discovery and account surfaces |
| Ink | #191C1C | Titles, prose and primary information |
| Umber | #6B432F | Brand actions and supplied reference language |
| Gold | #B88A43 | Reading progress, finished chapter markers and the current chapter |
| Teal | #28675E | Resume reading, saved work, published states and account preferences |
| Ink blue | #344E83 | Writer tools, active studio destinations and draft actions |
| Plum | #72566F | Community identity and conversation context |
| Red | #A5403B | Field errors and the final account-deletion action |

Background tints stay restrained. Artwork supplies most of the richer colour. Completed, current, unread, saved, private and published states always have words or symbols in addition to colour.

## Typography, structure and detail

Rubik remains the interface typeface from the account reference. A bundled serif derived from Adobe Source Serif 4 makes book titles, chapter headings and long-form prose render consistently. The included static instances are renamed WordWeft Serif; their source and SIL Open Font License are preserved. The serif is used deliberately for literary content, with Rubik used for tools, controls and metadata.

Desktop reading uses a 680 px column in the calm reader, with 19 px prose and generous line spacing. Mobile uses 18 px prose within a comfortable margin. The writer editor uses 18 px prose and a stable manuscript area. Page headings are bold and task names are direct. Notes, author metadata and status labels are smaller than the task itself.

Floating navigation keeps the supplied reference character. App surfaces make Your library visible on desktop. Mobile app navigation has Explore, Library, Community and Write. The studio has Overview, Stories, Comments and More. The reader and manuscript editor use their own contextual controls so global navigation does not interrupt the task.

Buttons retain restrained contact shadows. Cards have fine borders, intentional spacing and modest corners. There are no decorative gradients, ornamental dashboards or new generated illustrations. Real Lucide icon paths are used. Supplied raster artwork and identity assets are retained; archival Met artwork extends them.

## Reading and returning

New readers see Read from beginning. Returning readers see Continue reading, their overall progress, and a contents rail that distinguishes gold completed chapters, a gold-ring current chapter and neutral unread chapters. The example has six finished chapters, Chapter 7 in progress and 29% overall progress. Overall progress is a saved reading measure; it should not be calculated merely by dividing the current chapter number by the total.

The library begins with the saved chapter, not a statistics summary. Its resume panel gives the book title, writer, chapter title and reading position in one place. Other reading items have their own chapter counts and progress. Saved items do not display invented progress. Reading, Saved and Finished remain distinct views.

Paragraph comments open beside the selected passage on desktop and in a contextual sheet on mobile. The reader must stay anchored to the same passage when a thread opens or closes. Chapter discussions appear after the prose. Spoiler-sensitive guide information follows reading progress, and marked reviews stay closed until explicitly opened.

Paper, Sepia and Night remain available in the preference controls. The exported set shows Paper, paragraph discussion, Night preferences and chapter end. There is no additional standalone Sepia export. Type size, text width, typeface and spacing can be changed without losing the reading position. Saved-place feedback should be quiet and reliable.

## Writing and publishing

The studio opens around the latest private draft. Reader activity and statistics are secondary. Blue identifies the creation space; teal confirms a saved or published state. The sample writer is Yuna Mori, with 24 published chapters and a new private Chapter 25 of Spring Under the Bridge. Sample numbers are illustrative, not live account data.

The editor separates chapter navigation, manuscript, private notes and chapter metadata. A save indicator remains visible. Mobile gives the manuscript full width and places Chapters, Notes and Details in a reachable toolbar. Private notes never appear in the reader preview or published guide unless explicitly converted to reader-facing material.

Publishing is a deliberate review: chapter title, content rating, warnings, artwork permissions, reader preview and notification choices. Publishing notifications and community release posts are separate choices. The proposal shows Publish now and does not assume scheduled publishing. Publishing success offers View chapter and Back to studio. Unpublishing keeps chapter text and is separate from account deletion.

Statistics show numeric axes, individual values and a readable table. The displayed sample week totals 1,969 reads; the separate monthly total is 2,184. An implementation should offer an accessible data summary and use actual measured values.

## Community and identity

Discover, Following and Circles preserve the existing community model. Post formats remain Update, Release, Poll, Workshop and Recommendation. A release includes its story or chapter attachment; a poll distinguishes a selected vote and results; workshop context clarifies the kind of feedback sought. No direct messaging is introduced.

Circles show their identity, membership state and rules next to discussion. Mobile exposes Explore circles above the feed. Public profiles use actual artwork and deliberate initials until a user uploads a real photo. Follow, share, overflow actions and owner-only Edit profile stay distinct. Private library items and drafts do not appear on public profiles.

## Mobile adaptation

Mobile views are recomposed, not miniature desktop tables. Discovery keeps two readable columns. Story details preserve artwork and the quote before the synopsis and contents. Studio lists keep title, status and actions while reducing secondary data. Reader controls, writing tools and settings remain labeled or contextually obvious.

Short dialogs sit at the bottom of the screen. Long forms expand into scrollable sheets. The page behind each dialog remains visible through the scrim, preserving the relationship to the review, passage, manuscript, catalogue or account task. Contents, filters, chapter notes and account navigation use separate surfaces. In production, focused sheets must trap keyboard focus, provide a visible close action, close with Escape where applicable and return focus to their trigger. Reading and manuscript position must be preserved. Touch targets should have at least a 44 px activation area even when the visible icon is smaller. Input labels remain visible after typing.

## Motion and feedback specification

The PDF shows still design states. These are proposed implementation timings, not animations embedded in the PDF.

| Moment | Purpose | Motion | Reduced motion |
| --- | --- | --- | --- |
| Hero word replacement | Show Stories, Novels, Poems and Essays within the existing signature shape | Brief 180 ms vertical replacement after a quiet dwell; text width stays stable | Keep Stories fixed |
| Save a story | Confirm that the item is now in the library | Icon and label change with a 120 ms opacity transition | Instant icon and label change |
| Open paragraph thread | Explain the relationship between passage and discussion | Desktop rail or mobile sheet enters in 180 ms; paragraph position is held | Instant panel appearance with the same anchor |
| Change reader theme | Apply a preference without interrupting prose | 120 ms colour transition, without reflow | Instant colour change |
| Manuscript autosave | Confirm that the latest words are safe | Saving becomes All changes saved with a 120 ms label transition | Instant label change |
| Publish success | Confirm a deliberate action and show its result | 160 ms transition to a stable confirmation | Instant confirmation |
| Loading | Explain that content is on its way | Stable skeleton geometry with no shimmer required | Same stable skeleton |

Avoid continuous floating covers, scroll-driven text movement, automatic page turns, confetti and forced streaks. The reason to return should be an unfinished story, a saved place, a new chapter or a useful reader conversation.

## Product contracts to validate before implementation

These are static design references, not a functioning application. HTML files are editable layout sources. Only the included image gallery has working filtering and preview controls.

Backend support must be confirmed for offline draft persistence, revision comparisons, spoiler-reveal rules, reading-activity privacy controls, follower visibility and the exact effects of blocking, unpublishing and account deletion. Offline and conflict messages must only promise protection after storage and recovery are verified. The mature-content notice complements the platform's actual age and access controls. It does not implement age verification itself.

Terms and privacy screens are presentation templates containing sample excerpts, not new approved policies. Production copy and deletion consequences must come from the reviewed platform policies. Sample story names, chapter prose, catalogue counts, reviews, people, timings and analytics are design content. The supplied cover imagery does not imply catalogue availability.

## Research informing the revision

The design choices are an interpretation of the following guidance, applied to WordWeft's references and task flows. They are not evidence of tested retention or conversion improvements.

- Nielsen Norman Group, Good Visual Design, Explained: grid alignment, typographic hierarchy, intentional colour and useful imagery. https://www.nngroup.com/articles/good-visual-design/
- Nielsen Norman Group, The Aesthetic-Usability Effect: appearance can improve perceived usability, while observed task performance still matters. https://www.nngroup.com/articles/aesthetic-usability-effect/
- Nielsen Norman Group, Recognition vs. Recall: keep destinations and relevant actions visible so users do not have to remember hidden paths. https://www.nngroup.com/articles/recognition-and-recall/
- Apple Human Interface Guidelines, Motion: purposeful, brief feedback and an optional motion experience. https://developer.apple.com/design/human-interface-guidelines/motion
- Adobe Source Serif: typeface source and licence. https://github.com/adobe-fonts/source-serif

## Individual screen notes
### 01 Landing page

Your supplied hero art, dark Stories treatment, hand-drawn underline and asymmetric story discovery are restored. Mobile preserves the composition and reflows discovery into one lead story and two smaller stories. Covers and catalogue content remain illustrative.

Desktop: desktop/01-home.png
Mobile: mobile/01-home.png

### 02 Browse stories

Preserves the supplied editorial browse order: introduction, featured, genres, catalogue, collections. Saved controls live on each cover. Mobile offers a dedicated filter sheet and two readable feature columns.

Desktop: desktop/02-browse.png
Mobile: mobile/02-browse.png

### 03 Genre page

A genre-specific editorial introduction helps readers choose. The story grid and filters reuse the discovery language; mobile keeps the genre context above results.

Desktop: desktop/03-genre.png
Mobile: mobile/03-genre.png

### 04 Curated collection

The collection has a clear editorial premise, duration cue and suggested first read. The art colour informs its olive-paper introduction. Mobile places the introduction before art and the reading list.

Desktop: desktop/04-collection.png
Mobile: mobile/04-collection.png

### 05 Search initial state

Restores your supplied search-cover assets around the central search task. Mobile keeps a short artwork row below the main choices rather than surrounding the input. Suggestions remain selectable and keyboard access is specified.

Desktop: desktop/05-search-empty.png
Mobile: mobile/05-search-empty.png

### 06 Search results

Retains the supplied search hierarchy and distinguishes story and writer matches. Related items are separate from results. Query, scope counts and clear control remain visible; all counts are sample data.

Desktop: desktop/06-search-results.png
Mobile: mobile/06-search-results.png

### 07 No search results

The query is preserved and can be edited. Clear search and browse are separate recovery paths; no invented zero-result recommendations based on the query.

Desktop: desktop/07-search-no-results.png
Mobile: mobile/07-search-no-results.png

### 08 Story details for a new reader

Restores your three-column story detail composition, author identity, serif title, artwork quote and connected contents timeline. New readers start at Chapter 1. Mobile retains the artwork and quote, then the synopsis and contents.

Desktop: desktop/08-story-new.png
Mobile: mobile/08-story-new.png

### 09 Story details with reading progress

Restores the coloured completion timeline: gold completed markers, a gold-ring current chapter and neutral unread markers. Six chapters are finished, Chapter 7 is current, overall reading progress is 29%. Continue reading opens the saved paragraph.

Desktop: desktop/09-story-returning.png
Mobile: mobile/09-story-returning.png

### 10 Reader in paper theme

Reading uses a generous literary column, unobtrusive paragraph markers and visible saved-position feedback. The default reading surface keeps progress at the margin and chapter controls within reach.

Desktop: desktop/10-reader-paper.png
Mobile: mobile/10-reader-paper.png

### 11 Paragraph discussion

Reading uses a generous literary column, unobtrusive paragraph markers and visible saved-position feedback. The paragraph stays anchored when its discussion opens; mobile uses a contextual bottom sheet.

Desktop: desktop/11-reader-thread.png
Mobile: mobile/11-reader-thread.png

### 12 Night reading preferences

Reading uses a generous literary column, unobtrusive paragraph markers and visible saved-position feedback. Theme controls include Paper, Sepia and Night, with type size, width and spacing; mobile keeps them in a sheet.

Desktop: desktop/12-reader-night.png
Mobile: mobile/12-reader-night.png

### 13 Chapter end and discussion

Reading uses a generous literary column, unobtrusive paragraph markers and visible saved-position feedback. Chapter completion offers one clear next-chapter action, then the discussion.

Desktop: desktop/13-reader-end.png
Mobile: mobile/13-reader-end.png

### 14 Personal library

The first reading item becomes a clear resume panel with actual chapter context and saved progress. Reading, Saved and Finished remain separate. Mobile uses a compact cover and full-width resume action; only started books show progress.

Desktop: desktop/14-library.png
Mobile: mobile/14-library.png

### 15 Empty personal library

A real artwork makes the first-use reading space welcoming. The empty shelf explains what will appear and offers one direct path to discovery. No invented activity or statistics.

Desktop: desktop/15-library-empty.png
Mobile: mobile/15-library-empty.png

### 16 Public writer profile

A bridge artwork gives the public writer profile its own identity. Follow stays beside the name; biography, cadence and published stories are easy to scan. Mobile retains the banner, profile and labeled story tabs.

Desktop: desktop/16-writer-profile.png
Mobile: mobile/16-writer-profile.png

### 17 Your public profile

Owner profile keeps Edit profile separate from public content. Personal library and drafts stay private; the empty published-story area leads directly to the studio.

Desktop: desktop/17-my-profile.png
Mobile: mobile/17-my-profile.png

### 18 Followers and following

Followers and following reuse profile identity; no additional social graph. Follow controls have a stable, labeled state.

Desktop: desktop/18-followers.png
Mobile: mobile/18-followers.png

### 19 Notifications

Unread notices have a subtle dot and tint. Notification preferences can limit story updates and replies. Dates are anchored to 1 October 2026 India time; times are mock content.

Desktop: desktop/19-notifications.png
Mobile: mobile/19-notifications.png

### 20 Ratings and reviews

Rating summaries and review rows stay readable. Spoilers are deliberate disclosures, never blurred text. Write-review uses a separate focused dialog.

Desktop: desktop/20-reviews.png
Mobile: mobile/20-reviews.png

### 21 Sign in

Preserves the supplied 30% artwork strip, Rubik headings and open form composition. Google uses the supplied identity asset. Mobile keeps a short artwork header, permanent field labels and comfortable full-width controls.

Desktop: desktop/21-sign-in.png
Mobile: mobile/21-sign-in.png

### 22 Create account

Preserves the supplied 30% artwork strip, Rubik headings and open form composition. Google uses the supplied identity asset. Mobile keeps a short artwork header, permanent field labels and comfortable full-width controls.

Desktop: desktop/22-sign-up.png
Mobile: mobile/22-sign-up.png

### 23 Password reset

Preserves the supplied 30% artwork strip, Rubik headings and open form composition. Google uses the supplied identity asset. Mobile keeps a short artwork header, permanent field labels and comfortable full-width controls.

Desktop: desktop/23-reset-password.png
Mobile: mobile/23-reset-password.png

### 24 Email verification

Preserves the supplied 30% artwork strip, Rubik headings and open form composition. Google uses the supplied identity asset. Mobile keeps a short artwork header, permanent field labels and comfortable full-width controls.

Desktop: desktop/24-email-verification.png
Mobile: mobile/24-email-verification.png

### 25 Reader onboarding

Optional interest selection uses your genre artwork so choices feel tangible. Read, Write and Both steer the next destination; skipping opens discovery immediately. Preference choices can always be edited.

Desktop: desktop/25-onboarding.png
Mobile: mobile/25-onboarding.png

### 26 Community feed

Community gets a distinct but restrained plum accent; Release, Poll and Workshop tags carry context. Desktop circles are always visible; mobile exposes Explore circles above the feed. Saved posts and follow actions remain secondary.

Desktop: desktop/26-community.png
Mobile: mobile/26-community.png

### 27 Community circle

Circle identity, membership and composition are adjacent. Rules are readable alongside discussion. Mobile keeps Joined and Write a post in the circle introduction.

Desktop: desktop/27-circle.png
Mobile: mobile/27-circle.png

### 28 Community post and replies

Post detail keeps the same identity and attachment as the feed. Author replies are nested once with a visible relationship. Reply and spoiler handling remain contextual.

Desktop: desktop/28-community-post.png
Mobile: mobile/28-community-post.png

### 29 Create a community post

Post format and circle remain explicit. Release attaches an owned story or chapter; Poll exposes options; Workshop has excerpt and feedback context. Mobile uses a full editing sheet with visible Cancel and Publish actions.

Desktop: desktop/29-community-compose.png
Mobile: mobile/29-community-compose.png

### 30 Writer studio overview

The studio leads with the actual next draft, not an analytics dashboard. A blue work surface distinguishes creation, and green confirms saved work. Statistics are secondary; reader replies sit alongside the manuscript shelf.

Desktop: desktop/30-writer-dashboard.png
Mobile: mobile/30-writer-dashboard.png

### 31 My stories in the writer studio

A clear story inventory separates published and draft states. Search and recency help retrieve work. Mobile retains artwork, title, status and menu; it does not shrink a five-column table.

Desktop: desktop/31-writer-stories.png
Mobile: mobile/31-writer-stories.png

### 32 Create or edit a story

Title, synopsis, genre, language, format, status, tags and content rating are required design fields. Artwork is a genuine upload control. Mature content requires the correct tag and content warnings.

Desktop: desktop/32-create-story.png
Mobile: mobile/32-create-story.png

### 33 Story workspace and chapters

The workspace distinguishes 24 published chapters from the new private Chapter 25. Current work appears in a clear chapter list with word counts, status and overflow actions. Drag reordering needs keyboard alternatives in implementation.

Desktop: desktop/33-story-workspace.png
Mobile: mobile/33-story-workspace.png

### 34 Chapter editor

An actual writing surface: chapter navigation at left, a stable manuscript in the middle, private notes and metadata at right. Saved status is always visible. Mobile keeps the manuscript full width with Chapters, Notes and Details in a reachable toolbar.

Desktop: desktop/34-chapter-editor.png
Mobile: mobile/34-chapter-editor.png

### 35 Writer story guide

Characters, scenes and author notes distinguish private planning from published reader-facing details. Reveal-after chapter settings protect spoilers.

Desktop: desktop/35-story-guide.png
Mobile: mobile/35-story-guide.png

### 36 Publish chapter review

Publishing is a separate review with content checks, a reader preview and explicit notification options. Private notes are omitted from the preview. Publish now is the only release mode in this proposal.

Desktop: desktop/36-publish-chapter.png
Mobile: mobile/36-publish-chapter.png

### 37 Writer statistics

Statistics have real numeric axes and bar values, with sample data summing to 1,969 reads in the displayed week. Blue marks data; green confirms public activity. Mobile keeps labels readable and removes only the lowest-priority table column.

Desktop: desktop/37-writer-statistics.png
Mobile: mobile/37-writer-statistics.png

### 38 Reader comments in the studio

Chapter and paragraph discussions have explicit source context. Reporting is not presented as automatic removal; moderation permissions need to follow the actual backend.

Desktop: desktop/38-writer-comments.png
Mobile: mobile/38-writer-comments.png

### 39 Edit profile settings

Editable fields have permanent labels. Real photo upload is optional; initials provide a deliberate fallback. Username and website validation belong inline.

Desktop: desktop/39-settings-profile.png
Mobile: mobile/39-settings-profile.png

### 40 Reading and notification settings

Notification categories follow supported events. Reduced motion is visible and accessible. Per-device reader defaults are distinct from account notification preferences.

Desktop: desktop/40-settings-preferences.png
Mobile: mobile/40-settings-preferences.png

### 41 Privacy and security

Deletion is separated from ordinary settings and never a single unlabeled tap. Reading-activity and follower visibility are proposed settings and must be matched to supported backend controls.

Desktop: desktop/41-settings-security.png
Mobile: mobile/41-settings-security.png

### 42 Founding writers application

Simple form and direct program terms preserve the agreed non-exclusive ownership position. No invented guaranteed earnings, fake scarcity metrics or unapproved commission promise.

Desktop: desktop/42-founding-writers.png
Mobile: mobile/42-founding-writers.png

### 43 About WordWeft

Copy is honest about the early stage. No invented team, testimonials, audience numbers, trust badges or promises.

Desktop: desktop/43-about.png
Mobile: mobile/43-about.png

### 44 Help and contact

Help accordion and contact form are separate recovery paths. No invented support address or response-time guarantee. Uploading screenshots is not introduced without backend support.

Desktop: desktop/44-help-contact.png
Mobile: mobile/44-help-contact.png

### 45 Terms and policy reading template

This is a layout and navigation template, not newly drafted legal terms. Privacy and community policies reuse the readable single-column layout and anchored contents. Mature content text follows the known platform direction; final policy copy must be sourced.

Desktop: desktop/45-legal.png
Mobile: mobile/45-legal.png

### 46 Report content dialog

Reporting uses a reason and optional context, then a submitted state. It never implies automatic removal. Block is a separate action.

Desktop: desktop/46-report.png
Mobile: mobile/46-report.png

### 47 Unavailable offline loading and success

State board covers 404/unpublished content, editor offline, stable loading and publishing success. Offline draft persistence is a proposed contract and must be verified before shipping.

Desktop: desktop/47-system-states.png
Mobile: mobile/47-system-states.png

### 48 Navigation and account menu

Mobile exposes all primary and account destinations in a labeled menu, complementing the four-destination bottom navigation. Desktop account menu is compact. Writer studio is named explicitly and is always one step away.

Desktop: desktop/48-mobile-navigation.png
Mobile: mobile/48-mobile-navigation.png

### 49 Catalogue filter sheet

Mobile filter sheet shows all catalogue facets without narrowing the results column. Apply and clear are visible. Desktop uses the same values in the sidebar.

Desktop: desktop/49-filter-sheet.png
Mobile: mobile/49-filter-sheet.png

### 50 Mature content disclosure

A clear content notice is distinct from age verification. Under-age access must be blocked by actual account/access controls; the dialog is not a substitute for enforcement.

Desktop: desktop/50-mature-gate.png
Mobile: mobile/50-mature-gate.png

### 51 Write a rating and review

One review per account and editing depend on backend policy. Stars have labels in implementation, and spoiler marking is explicit.

Desktop: desktop/51-review-compose.png
Mobile: mobile/51-review-compose.png

### 52 Form error and editor conflict states

Validation uses specific guidance under the field. Concurrent editor conflict and confirmation copy are proposed product behavior and must be backed by storage/version support. Application receipt storage is optional concept scope.

Desktop: desktop/52-form-validation.png
Mobile: mobile/52-form-validation.png

### 53 Reader chapter list sheet

Connected completed, current and unread chapter states continue into the mobile contents sheet. The return action preserves the saved paragraph. Desktop uses the same vocabulary in its contents rail.

Desktop: desktop/53-reader-chapters.png
Mobile: mobile/53-reader-chapters.png

### 54 Mobile editor details and tools

Chapter metadata and private notes move out of the mobile manuscript into this sheet. Reader preview never includes private notes.

Desktop: desktop/54-editor-details.png
Mobile: mobile/54-editor-details.png

### 55 Share story and copy link

Desktop share opens a copy-link dialog; mobile can invoke the native share sheet. The visual is a review of the app fallback, not a fabricated OS sheet. Production URLs must use actual story IDs.

Desktop: desktop/55-share-story.png
Mobile: mobile/55-share-story.png

### 56 Writer studio before the first story

The first-use studio avoids fake statistics and reader activity. A single create-story path takes the user to the private draft flow.

Desktop: desktop/56-writer-empty.png
Mobile: mobile/56-writer-empty.png

### 57 Blocked accounts

This list uses public identity and a clear unblock action. Confirmation copy must match the actual comment, follow and visibility behavior enforced by the backend.

Desktop: desktop/57-blocked-accounts.png
Mobile: mobile/57-blocked-accounts.png

### 58 Privacy policy page

A separate policy screen uses the same reading template. Text is design scaffolding and cannot be treated as a compliant privacy policy or a promise about unsupported data controls.

Desktop: desktop/58-privacy.png
Mobile: mobile/58-privacy.png

### 59 Unpublish chapter confirmation

Unpublish is reversible and separate from deletion. Final behavior for comments, likes and reader progress must follow the production model.

Desktop: desktop/59-unpublish-confirmation.png
Mobile: mobile/59-unpublish-confirmation.png

### 60 Delete account confirmation

Deletion is a separate deliberate flow. This screen deliberately does not invent deletion timelines or retention guarantees; final consequences must be sourced from the production policy.

Desktop: desktop/60-delete-account-confirmation.png
Mobile: mobile/60-delete-account-confirmation.png

