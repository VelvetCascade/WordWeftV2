# Find every matching passage

Before: the dialog reported 54 matching passages but rendered only the first 50, without a continuation action. After: readers can reveal another 50 matches at a time; the live count reports how many are shown. The continuation button retains keyboard focus and becomes “All matches shown” at the end. Editing/clearing the query resets the window.

Matching captures use the same disposable 205-paragraph chapter and query at 390×844 and 1440×1000: `before-*.png` shows the production limit; `after-*.png` shows the initial continuation and visible count; `expanded-*.png` shows passage 54 after continuation.

Regression: baseline failed at the missing continuation control at both widths. The fixed browser journey covers 0, 1, 49, 50, 51, 54 and 205 results; query reset/clear; keyboard continuation/focus retention; jump to passage 54 and focus on its existing anchor without navigation/reload. Existing note/bookmark behavior is unchanged. Full suite 320 passed; typecheck and build passed.

The browser tests control synthetic API responses and block live ads; no live account data appears here. Mobile captures use Chromium viewport emulation and do not establish physical iPhone/native Safari behavior.
