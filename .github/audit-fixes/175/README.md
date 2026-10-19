# Ad geometry while the reader is settled (#175)

Before: the unresolved-ad fallback removed a visible reserved slot after seven seconds, shifting the footer and scroll context. After: provider no-fill, script errors and fallback timeout mark the ad empty immediately but collapse its geometry only when its top is below the viewport. Slots above the viewport retain their geometry too, avoiding scroll-anchor compensation. Returning above an empty slot releases its space once it is below the viewport; this is deferred cleanup rather than permanent blank space.

The existing provider `ins` and format dimensions remain intact. Late fill restores a previously collapsed slot only while below the viewport; an already visible reservation stays stable. A clipped slot is inert and hidden from accessibility navigation until it can safely reappear. Provider status observation remains active after timeout.

Matched synthetic captures show search at 390×844 and 1440×1000, with the first footer link focused before waiting 7.5 seconds. `before-*` runs production 4055dbf; `after-*` runs this fix. JSON records reserved height, footer viewport position, scrollY, focused href, and layout-shift entries. Compare entries added across the wait: initial navigation/font shifts are included separately in the before snapshot. These are controlled browser observations, not field Core Web Vitals or a production ad-network test.

Run the app and set `E2E_BASE_URL`, `AUDIT_EVIDENCE_DIR` and `AUDIT_PHASE=before|after`, then run `npx playwright test e2e/audit-175-ad-stability.spec.ts`. Search responses and ad-network script behavior are controlled and synthetic. Other checks cover below-viewport no-fill, late fill, successful fill past fallback, script failure and browser Back on article/horizontal placements. Home does not render AdUnit in this production source. Mobile is Chromium viewport emulation, not physical iPhone/native Safari verification.

Validation: baseline two browser cases failed because the reserved height became zero. Fixed four browser cases pass. All 320 unit tests, TypeScript checking, production build and SSR/SEO build pass. The existing bundle-size advisory is unchanged.
