# Private-note hydration regression (#211)

Synthetic note shown in the full reader on desktop (1440px) and mobile Chromium (390px). The local book, chapter, and synthetic private note are served by the disposable Spring/Mongo backend; the saved-passages request is gated before continuing to the real server. The fixture note was restored afterward. Loading screenshots show Save disabled and zero PUT requests; loaded screenshots show the existing note retained after an intentional loaded save; a fresh backend GET confirms persistence. No production data was accessed or changed. Physical iPhone behavior is unverified.

`node --test tests/passageHydration.test.mjs` exercises the actual component and API client with delayed and failed network responses. The test failed before the fix because Save was enabled while loading. After the fix it checks retained typing, editing, deliberate clearing, retry, tab reopening, and account changes at both widths.

The backend still uses unconditional PUT; atomic conflict handling for simultaneous saves on separate devices is outside this loading fix.
