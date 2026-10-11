# Production audit coverage ledger — 2026-10-11

This ledger corrects a process gap: screenshots of a page had been conflated with verification of its actions. They are different forms of evidence. The product audit remains open until its outstanding journeys have been exercised or explicitly recorded as blocked.

Audited source: production `4055dbf32044d69afa0679a932e22b240117143a`. No application implementation. Disposable local accounts/data only.

## Coverage definitions

- **Source-inventoried:** the JSX control/handler exists. This is not a behavior test or a pass.
- **Rendered/observed:** the control or page state was captured. This does not prove activation or downstream behavior.
- **Journey-tested:** an action and its resulting state/request were exercised. The individual scenario may pass or expose a finding.
- **Outstanding:** additional state, role, data or input combinations still require verification. A partially checked area is not marked complete.

`source-controls.json` inventories JSX control/form/interactive instances across page and component files, including conditional controls missed by initial page snapshots. `control-inventory.json` inventories rendered controls for 34 representative page/role combinations at 390px and 1440px. Repeated header/footer controls are counted as repeated instances, not unique features. The editor inventory waits for the mounted editable surface. The files deliberately retain unverified statuses instead of marking controls passed by inference.

## Newly exercised journeys

| Journey | Exercised outcomes | Remaining checks |
| --- | --- | --- |
| Chapter sharing | Mobile More actions and desktop trigger; Light/Dark; clipboard, native payload, X/Facebook/WhatsApp/Telegram URL inspection | Native OS delivery, fresh-recipient access and writer/manage entry points |
| Book sharing | Copy-denial feedback, manual link availability, short-width/landscape layout | Native OS delivery and social preview cache behavior |
| Author sharing | Quick/portfolio switching, URL-share failure/cancellation, file cancellation, delayed-asset export readiness, short heights | Physical-device share sheet, all author metadata/extreme name layouts |
| Quote sharing | Selection trigger comparison, five appearance choices, selected-state semantics/contrast, file cancellation | Physical iOS selection, extreme accepted Unicode quotes, all export metadata layouts |
| Modal background ownership | Pointer activation of exposed bottom navigation at portrait and landscape widths | Sweep all dialog callers and nested-modal states |
| Library return navigation | Search/sort → open story → browser Back | Shelf/view/pagination restoration, cross-account state and reader return |
| Verification | Invalid OTP, valid OTP, unverified-account sign-in, concurrent resend | Expiry/cooldown exhaustion, server failures, accessibility announcements |
| Registration | Actual UI username/birthday/password/legal consent → local email capture → verification and established session | Age boundary/leap-year combinations, duplicate identities, OAuth |
| Password recovery | Email request → captured reset link → reset form → new-password login | Expired/reused links, revoked-session policy, multi-tab races |
| Feedback | Editing during a delayed submit, success, navigate away, Back and draft inspection | Every conditional field, validation boundaries and server rejection |
| Review replies | Concurrent submissions, edits during sending, failure recovery and reopening | Main review composition/edit/delete, all reply identities and moderation states |
| Private reader notes | Initial load failure/retry, close/reopen draft retention, ordinary save and real-persistence overwrite before hydration | Cross-device revisions, removal/navigation and account transitions |
| Writer chapter release | Real UI story creation → chapter autosave → preview → publish → published draft edit → comparison → release update; live content isolation confirmed | Scheduling/withdrawal/restore/import/reordering, conflict/offline and rich selection boundary matrix |
| Writer planning | Mobile scene create/edit/list/timeline/delete; desktop public chapter-gated Bible entry create/preview/delete; mobile private note expand/save/edit/delete | Character CRUD, actual reader reveal access, all relationships and chronology/filter combinations |
| Community actions | Real post create/edit, reader like/save/unsave, poll create/vote; menu dismissal and Saved membership tests | Remaining post delete, recommendations/releases/workshops, comment moderation, all circle/filter combinations |
| Author relationships | Real follow and unfollow, own-profile count and live connections comparison | Followers visibility/permission, pagination, failures and out-of-order account updates |
| Book reviews | Real mobile create/edit/delete, success prompt vs modal pointer ownership; reply race/failure checks | Main composer pending revision safety, reply moderation and all error/permission states |
| Contact | Edits during delayed submission and Send another message | Real support-delivery integration, remaining category/incident/validation/retry combinations |
| Reader progress | Fresh chapter 1 completion → Continue opens chapter 2 → both completions confirmed through backend reads | Scroll restoration during revisions, restart, failed-save queue/retry and multi-device transitions |
| Character/reveal access | Real character create/edit/delete; public guest background; private goals/aliases/spoilers and gated Bible lore absent before completion; chapter completion unlocks lore | Reader character preview after all reveal boundaries, relationship changes and legacy/reordered/deleted chapter combinations |
| Library shelves | Real creation, bulk-add, public profile visibility and private visibility verified as guest; available management actions inspected | Bulk removal/error rollback, large selection, account transitions and shelf lifecycle proposal |
| Notification pagination | Empty initial Unread with more pages → All load-more → older unread found | Search/type pagination, concurrent arrival, read actions and retries |

All native Web Share failure/cancellation tests use the browser API's standard error contracts injected locally; they are not physical-device OS tests. External social windows were intercepted, so no social post or message was sent. Local email was captured, never delivered externally. Download artifacts are genuine local browser exports.

## Product areas still requiring deeper action coverage

| Product area | Evidence already present | Outstanding coverage |
| --- | --- | --- |
| Global navigation/account menu | Desktop/mobile route captures, browser-return tests, shared dialog keyboard finding | Every menu link, logout/session expiry, nested overlays and history combinations |
| Home/discovery/browse/search/genre/tag | Theme/viewport captures, global-search keyboard/contrast findings, ad-layout shift | Every sort/filter combination, query editing/back-forward, empty/error/pagination transitions |
| Opening feed/preferences/events | Rendered states, challenge concurrency and partial-outage findings | Feed tuning and reactions, empty/end feed, event submission eligibility and concurrent updates |
| Story details/library/reviews/shelves | Library actions, report lifecycle, shelf draft loss, return state | Review add/edit/delete/replies, all bulk/library rollback, shelf privacy/public profile updates |
| Reader | Independent app/reader appearance matrix, mood-section positions, focus/preferences/discussion, find limit, comments, quote sharing | Remaining progress restart/retry/multi-device and bookmark lifecycle, private-note removal/navigation/conflict states, chapter boundary/access changes, each supported rich block/paragraph control, native touch |
| Writer studio/inbox/create/manuscript | Route captures, heading roundtrip, toolkit/atmosphere/planning views, history keyboard and chart/form contrast | Every formatting command and selection boundary, undo/redo/paste, autosave/offline/conflict, remaining reorder/import/schedule/withdraw/delete/restore and multi-chapter release-review combinations |
| Characters/Story Bible/scenes/private notes | Forms/views observed; source controls inventoried | Remaining character cancellation/races, legacy and reordered chapter reveal access, relationships and timeline filter combinations |
| Profile/settings/auth | Hidden-tab validation and social-link findings; registration/verification/reset journeys | Profile/account deletion/password change/OAuth, followers/following, all privacy and notification preference mutations |
| Community | Composer validation/format discovery, comments pending-draft loss and contextual captures | Every circle/filter/follow/reaction/poll/workshop/release/edit/delete/report/moderation flow and rollback |
| Notifications | Filter/pagination defect and preference views | Every preference/read-all/read-one response state, SSE reconnect and navigation target |
| Help/contact/feedback/legal/about/features | Page captures, support-page contrast, feedback submit race, signup legal dialog | Contact submission/retry/draft behavior, remaining FAQ/TOC links, policy navigation and conditional feedback branches |
| Founding writers/admin | Public/admin views, administration contrast | Application lifecycle, member/story/report/admin action confirmations, retries and permissions |
| Cross-cutting resilience | Several deterministic delayed/failed requests, missing-image/crop findings | Each interaction's duplicate prevention, race/error/recovery state; browser storage denial, reduced-motion/text scaling and browser engine matrix |

This is a **coverage ledger, not an assertion that these outstanding areas are defect-free**. Existing broad older tickets are not substitutes for reproductions. A failed audit selector/setup is excluded from product findings. A disabled/temporarily removed feature (for example Story Poster in book sharing) is not reported as broken merely because source remains.

The actual UI has been inspected and interaction scenarios run, but neither static parsing nor counts of captures establish pixel-perfect or exhaustive product quality. Native iPhone/Safari and real third-party delivery remain unverified. No implementation, backend schema migration, production content write, or deployment is included.
