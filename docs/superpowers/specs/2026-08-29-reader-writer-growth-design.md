# Reader and Writer Growth Design

## Purpose

Complete the approved WordWeft Phase 1 and Phase 2 growth features around the publishing foundation: lower the cost of bringing an existing manuscript, make writing recoverable, give new readers an immediate taste profile, create a short-form Hook Feed for discovery, and add individual reading challenges plus staff-curated genre events.

## Scope

- Import `.txt`, `.md`, and `.docx` manuscripts into an owned story as draft chapters.
- Capture recoverable chapter revisions automatically and let writers restore them.
- Let readers choose favorite genres during a lightweight taste setup.
- Show a personalized Hook Feed made from published-story openings; likes and skips tune the session ordering without cross-site profiling.
- Let readers join individual reading challenges and update progress from existing reading activity.
- Show public genre events that curate published stories and allow eligible submissions.

## Explicit exclusions

- No manuscript export.
- No buddy reads, reading rooms, chapter checkpoints, spoiler rooms, or direct messaging.
- No automatic AI rewriting, scoring, or moderation decisions.
- No raw IP addresses, precise location, demographic inference, or cross-site advertising identifiers.

## Manuscript import and recovery

The backend parser accepts UTF-8 text/Markdown and DOCX Open XML. It treats Markdown headings, DOCX heading paragraphs, and conventional `Chapter ...` lines as chapter boundaries. Unlabelled content becomes one chapter. Imported chapters are always drafts, and imports never overwrite existing chapters.

Every mutation of an existing chapter can capture its previous title/content as a `ChapterRevision`. Autosave backups are throttled to one recovery point per five minutes; explicit saves and publication transitions may create an immediate point. A story keeps the latest fifty revisions per chapter. Writers can list and restore only revisions belonging to their own story.

## Hook Feed and taste profile

Favorite genres remain on the user profile and become the explicit taste signal. The Hook Feed returns opening excerpts from published, discoverable stories. Ranking is transparent: selected-genre matches first, then recent engagement, with already-seen story IDs excluded. The feed response explains matched genres. Readers may like a chapter or skip a card; no hidden psychological profile is built.

## Challenges and genre events

Challenge templates are platform-defined goals such as chapters read or minutes read. A user joins individually and progress derives from existing `UserStats`; there are no shared rooms or chapter checkpoints. Genre events are public date-bounded collections with a genre, prompt, and eligible submitted book IDs. Writers may submit only their own published matching story. Staff roles manage event creation and status.

## Verification

Parser, backup ownership/throttling, feed visibility/ranking, challenge progress, and event submission eligibility receive backend unit tests. Pure frontend utilities receive Node tests. The complete frontend test/typecheck/build/bundle checks and backend suite run before completion.
