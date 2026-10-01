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
