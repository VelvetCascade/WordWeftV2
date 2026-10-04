# Improve whole-app reliability, reading, writing and journey continuity

Readers can keep their place, organize a story without losing context, use private passage notes and open matching chapter/passage discussions. Writers can recover account-scoped form drafts, edit planning tools alongside the manuscript, review the complete ordered release, detect stale editor writes and leave a failed save deliberately. Discovery, onboarding, public profiles, notifications, community return behavior and support now follow the user's current task.

The approved audit's 60 findings and eight motion recommendations are tracked in `docs/ux-audit/COVERAGE.md`. Changes preserve existing features and the premium visual system. Shared boundaries isolate optional storage/announcement failures; bounded anonymous diagnostics support investigating the reported intermittent native errors/taps. Local mutation feedback, stable controls, accessible fields, theme contrast, reduced motion and responsive dialog limits improve continuity.

Validation: 224 frontend unit tests, 343 backend tests and 140 assertions across 90 local API requests passed; TypeScript, production/SSR/SEO build and the initial-entry bundle budget passed (162.99 kB gzip). All 275 browser cases have passing evidence across the broad run, corrected targeted regressions and three separately executed production-build recovery cases. See `docs/ux-audit/VALIDATION.md` for exact run accounting and failure dispositions.

Deploy frontend and backend together. Mongo changes are additive fields and private passage bookmarks/indexes, with no destructive migration. Rollback leaves data intact but restores older privacy/concurrency semantics. Physical iPhone/native VoiceOver and real production Atlas/R2/SMTP remain unverified; native random tap/crash resolution is not claimed.

Base: `production` (`42bf400`). No production data was mutated during validation.
