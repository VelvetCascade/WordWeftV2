# Journey quality pass

This increment starts at the user's pushed checkpoint, `c478186aa1147deb30f45f8f24276d4f65cae73a`, on `redesign/premium-design-v2`. It preserves the existing reading, writing, community and account features.

## Changes

- The homepage uses linked covers from eligible published books, with coordinated stories/novels/poems transitions. It pauses for interaction, background tabs and reduced motion. An empty format is never filled with a different kind of book. Loading, empty and failed requests have usable states, including the server-rendered homepage.
- Genre tiles have distinct, thematically selected Metropolitan Museum Open Access images. The source, artist and public-domain information are recorded in `public/discovery-artwork/credits.json`, with visible artwork credits. No images were generated for this pass.
- Continue reading advances past a completed chapter. Story details, the reader and the library share the same published-chapter completion and resume rules. Chapter IDs survive chapter reordering. Immediate Back, chapter changes and reloads retain pending observations; failed saves remain visible and retry the whole book. Saves cannot migrate between signed-in accounts.
- MongoDB updates preserve simultaneous chapter saves and count lifetime chapter/book completions once. Restart clears the reading position without duplicating reading statistics. Removed or draft chapters do not inflate completion totals.
- Guests can open an eligible published story's character guide and keyboard-accessible inline character previews. Private drafts and writer-only character fields remain protected.
- Settings, notifications, help, feedback and policy journeys provide local return actions. Unsaved public profile, contact and feedback fields survive those round trips. Catalog filters, loaded results, community selections and author activity survive Back. Passwords are not stored in these drafts.
- Live notification open/dismiss actions work by keyboard, fit narrow phones and follow the active theme. A delayed page no longer takes focus or scroll away after the user has started interacting with a notification, search, menu or other control.
- The original WordWeft SVG is restored across navigation, authentication, the reader and footer, following the active theme. Tablet navigation avoids overlapping actions. Legal pages have a deliberate prose width and a 48px contents/article gap on desktop.
- The writing tour works on narrow phones and supports keyboard focus and Escape. Character scanning continues directly into linking the newly created cast. Content warnings use readable rose/red semantics; scan and story-guide icons match their actions. Formatting controls and the atmosphere picker remain reachable by keyboard. Failed character-profile saves keep the publication review open for retry.
- Populated writing-statistics chart values use the theme's readable text color, including dark appearance.
- Discovery sign-in restores the selected story and like action. Failed search pagination retries the same page. Contact sign-in returns to the user's question, and a missing password-reset token offers a clear recovery route.

## Verification

The application was run against a disposable local Spring backend and MongoDB, with real authentication, captured local verification mail, story publication, chapter content and persistence. Third-party advertisements were disabled in the browser fixture; application API requests used the local runtime unless a test explicitly exercised an outage, controlled catalog/event data or delayed route loading.

| Check | Result |
| --- | --- |
| `npm test` | 105 passed; includes controlled account-switch, stale-read, Restart and overlapping-save races |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; 17 complete public pages plus the dynamic HTML function |
| `npm run check:bundle` | Passed; initial JavaScript 160.40 kB gzip against a 350 kB limit |
| Maven backend tests, with `WORDWEFT_TEST_MONGO_URI` set | 240 passed, 0 skipped; includes five real MongoDB regression tests |
| Maven package | Passed |
| `npm run test:api:local` | 139 assertions across 90 actual API requests, including cleanup |
| Playwright browser suite | 145 scenarios verified: 144 passed in the complete run; the remaining analytics contrast check passed after its color fix in the focused rerun |
| Additional delayed-route regressions | 2 passed; real route surface/navigation with a 3.2s lazy destination, saved Back position and user focus preservation |
| Final targeted browser rerun | 6 passed, including the analytics contrast fix, chart layout, search, Back and both delayed-route cases |

The browser suite covers registration/age/terms/verification/reset, reading and library progression, reader access and preferences, public character access, account privacy, catalog/discovery, community formats and moderation, settings/support return journeys, live notification keyboard actions during delayed page loading, and drafting/autosave/recovery/preview/publication/scheduling/revisions. It includes 320px, 390/393px, 768px, 1440px and 1920px layouts, dark appearance, reduced motion, keyboard interaction and accessibility checks.

Fresh screenshots of the live local catalog and connected journeys are in `artifacts/journey-quality`. `discovery/responsive-evidence.json` records viewport widths, actual loaded hero cover URLs, legal layout geometry and browser errors. `discovery/home-server-rendered.html` and its screenshot were captured from the built public renderer with JavaScript disabled.

The first complete run identified an old assertion for the removed static home collage; it was replaced with a check against the actual published hero catalog. The next complete run identified the populated dark chart contrast issue above. The affected checks were rerun successfully; the table reports complete and targeted runs separately.

## Runtime and deployment

The existing `scripts/dev-local-backend.sh` starts the fixed disposable runtime; the backend requires Java 17+ and Maven. The local test setup uses MongoDB on port 27028, the backend on 8080, captured verification mail on 8081 and Vite on 3000. The real Mongo regression tests use separate temporary databases and remove them after each test.

Deploy both backend and frontend changes for the new hero endpoint, normalized reading progress and published character access to take effect. Existing progress documents are normalized on access; the atomic save path retains the existing unique user/book index and lifetime completion ledger.

Production Google OAuth, ImageKit/R2 uploads and external email delivery were not exercised with live credentials. Unconfigured local R2 correctly reports unavailable. No production data was edited or deployment performed during this verification.
