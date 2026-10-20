Before → after: a successful unsave removed the real local saved reaction but left one card in Saved. It now removes that card immediately after the successful response and shows the existing empty state. Other feed modes and the detail view retain the conversation.

The card stays mounted while the request is pending. A failed request restores its selected Saved state and displays the existing inline error. The feed removes only confirmed unsaves, keeps its cursor, and excludes confirmed removals from late pagination responses. Changing the active query resets that local exclusion set.

The matching Light screenshots use the same synthetic post content, account, viewport (390×844 or 1440×1000), and scroll position after the successful unsave. Each run creates its own disposable post and deletes it in cleanup. Full-page captures show the existing page and navigation without changing the visual design. `before/results.json` and `after/results.json` record the backend's saved membership, rendered card count, and empty state; baseline failed both widths and stale pagination, while the fixed run passes all nine cases.

The test logs into the disposable local reader/writer accounts and uses real post creation, save/unsave, saved-feed reads, and deletion APIs. Browser feed responses are isolated to the created fixture (seeded into a mode when necessary) so other workers' posts do not enter screenshots and shared follows/memberships are unchanged. The five non-Saved checks exercise discover/following/circles/circle/detail rendering with real unsave requests; they do not claim to verify feed membership selection. The failed-save response and stale cursor page are controlled browser responses. The delayed successful request uses the real backend; the card stays visible and disabled until it completes.

Run with the seeded disposable backend:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 AUDIT_OUTPUT=./audit-output node e2e/audit-212-saved-feed.mjs
```

`AUDIT_SUCCESS_ONLY=1` limits a run to the two matching screenshot cases. The browser defaults to managed Chromium, with installed Chromium or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` fallback. Native iPhone/Safari was not tested. No production data, external messages, merge, or deployment.
