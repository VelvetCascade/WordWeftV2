# Search keyboard selection (#174)

Before: ArrowDown only changed the visible row highlight; the search input had no combobox role or active descendant. After: the focused combobox points to the selected listbox option, which stays in view. Story/person activation, pending and empty queries, composition Enter, Tab, Escape focus return and full-search fallback are covered.

The matched before/after screenshots use the same synthetic mixed search results at 1280×900 and 390×900. The visual treatment is preserved; selection semantics are recorded in the JSON and asserted by the browser regression.

Run the frontend and disposable backend, then `E2E_BASE_URL=http://127.0.0.1:3024 node .github/audit-fixes/174/regression.mjs`. Set `AUDIT_BEFORE=1` against production source to reproduce the baseline captures. `CHROMIUM_PATH` is optional; otherwise a system or Playwright-managed browser is used. Autocomplete responses alone are controlled with synthetic fixtures; navigation/focus exercise the real application. Desktop/mobile Chromium emulation only; physical screen-reader/iPhone testing was not available.
