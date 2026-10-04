# Publishing and editor verification

Verified on 4 October 2026 with disposable local stories, the real local MongoDB backend, and Chromium. Implementation commits are `75c4c2c`, `96c93f5` and `89a9eb5`; this follow-up supplies browser evidence and fixes preview styling exposed by that verification.

| Finding | Final behavior | Verification |
| --- | --- | --- |
| F07 | Editor and chapter-manager publication list every affected earlier chapter, warnings, resulting rating, private-story visibility change and replaced schedules. Complete-release and artwork approval are required. A changed release invalidates its review and requires fresh approval. | Ordered two-chapter release, draft-to-public story transition, earlier-warning rating increase, stale review remaining private, and manager release browser cases. Server publication tests cover ordered review and revision checks. |
| F10 | Editor context, title, chapter rail and publication panel use the same publication-status helper. Scheduled labels include date, timezone and relative timing. | Scheduled editor screenshot and browser assertions; publication-label unit test. |
| F39 | No warnings displays neutral “None”; selected warnings receive amber emphasis, and mature warnings receive red emphasis plus immediate Mature (18+) guidance. Reader-visible author notes and private planning notes are identified separately. Release reviews disclose warnings and their rating consequence across the complete release. | Ordered release includes an earlier Violence warning and resulting Teen (13) rating; stale review refresh includes Strong language. Screenshot reviewed for warning emphasis. Mature warning colors and guidance also inspected in source; every warning/color combination was not separately exercised in the browser. |
| F40 | Failed online saves offer retry, verified device-copy exit, explicit discard, export and copy. Device exit requires exact storage readback. Unavailable device storage keeps the editor open and offers export; device copies are never described as online saves. | Browser forces HTTP 503 and blocked storage, downloads an HTML export, then verifies successful device-only exit and recovery without changing the server manuscript. Unit cases cover failed and mismatched readback. |
| F41 | Each mounted editor has an independent session ID, even when session storage is cloned. Cross-tab notices and server revision checks preserve the current draft and require deliberate comparison/replacement. Replacement retains the server version in revision history. | Two-tab browser case clones session storage, saves A, rejects stale B, compares both, deliberately replaces A and verifies A remains in revisions. Independent-device behavior uses the same server revision contract; separate physical devices were not exercised. |
| F42 | Reader preview offers desktop/390-pixel phone canvases and light/sepia/dark appearance, with reader spoiler and footnote interactions. Closing restores manuscript selection and scroll. Preview typography now scales against its own canvas, and opened footnotes cannot intercept toolbar/close controls. | Phone/sepia heading-fit assertion failed before the scoped CSS correction. The earlier interaction run also reproduced footnote-overlay interception of Close. Final browser case verifies fitted title, reveal, opened footnote, direct Close and selected text restoration, with zero WCAG A/AA Axe violations in the opened preview. |
| F43 | Scheduled releases show their time consistently and offer Cancel schedule. Publishing a later chapter explains that an earlier schedule will be replaced by publication now. | Browser cancels a scheduled chapter, verifies draft status and cleared schedule, schedules it again, reviews replacement, publishes and verifies its schedule is cleared. Existing schedule unit cases preserve future-time validation. |

## Checks and evidence

- Focused publication/editor suite: seven cases passed using one Chromium worker at `http://127.0.0.1:3005`, backed by local port 8080. The two visibility cases were additionally strengthened to assert persisted story visibility and rating, then rerun.
- Separate inline Story guide integration passed: adding a character refreshes mentions while preserving the mounted editor and caret. This covers the publishing/planning F38 boundary.
- Eight focused publication/session unit tests and TypeScript checks passed. Coordinated main-branch validation reported 340 backend tests, 223 frontend tests, typecheck/build and 140 API assertions passing; those wider totals are recorded by the integration owner.
- Existing writer and character-review journey tests now use the complete-release approval controls and common scheduled label.
- All screenshots below were opened and visually inspected. Phone preview is a canvas inside desktop Chromium, not a physical-phone capture.

| Evidence | Inspected result |
| --- | --- |
| [Complete release](evidence/editor-complete-release-desktop.png) | Both chapters, private-to-public disclosure, warning/rating consequence and required approvals fit the review. |
| [Scheduled editor](evidence/editor-scheduled-desktop.png) | Shared scheduled status/time appears in context, manuscript, rail and publication panel; cancellation is visible. |
| [Failed save exit](evidence/editor-failed-save-exit.png) | Blocked-storage explanation, online-save distinction, export/copy and deliberate discard remain readable. |
| [Phone sepia preview](evidence/editor-phone-sepia-preview.png) | Phone-width title and opened note fit; reader prose/sepia appearance is retained. |

Reproduction commands:

```sh
E2E_BASE_URL=http://127.0.0.1:3005 npx playwright test e2e/quality-publishing-editor.spec.ts --workers=1 --grep-invert 'inline story guide'
E2E_BASE_URL=http://127.0.0.1:3005 npx playwright test e2e/quality-publishing-editor.spec.ts --workers=1 --grep 'inline story guide'
node --test tests/publishing.test.ts tests/manuscriptSession.test.ts
npm run typecheck
```

Physical iPhone/iOS, native VoiceOver, real keyboard clearance, and cross-device network interruptions remain unverified. Axe covers the opened preview's DOM accessibility and does not replace native assistive-technology validation. Tests mutate only stories they create and delete those stories afterward.


## Final integration — 4 October 2026

The integrated broad run passed the primary publishing/editor and guide integration cases, including release impact, concurrent edit/revision recovery, failed-save exit, scheduling and viewport/theme preview. Final suite counts supersede earlier checkpoint counts. See [VALIDATION.md](VALIDATION.md) for complete execution accounting and physical-device/production-service limits.
