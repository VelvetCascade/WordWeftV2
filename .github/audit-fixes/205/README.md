# Library return state — #205

Before → after repeats the same All stories / Quiet weekend reads / spring / Title A–Z → story → browser Back journey at 1440×1000 and 390×844. Before, the Library controls return to defaults. After, the originating history entry restores its browsing context. Fresh navigation receives a new entry; another account cannot reuse this account’s snapshot.

The browser suite also checks Forward, an expanded 26-result synthetic library, scroll restoration after delayed reading progress, empty search results, and a resume card’s Story details return. It uses disposable local accounts and the actual local backend, with synthetic catalog expansion and progress delays for the pagination scenario. No production data is accessed. Chromium mobile emulation; physical iPhone/Safari was not tested.

Start the local frontend and disposable backend, then run `E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/library-return.spec.ts`. Set `AUDIT_CAPTURE=after` to refresh matched screenshots.
