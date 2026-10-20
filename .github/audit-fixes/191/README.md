# Independent reading-goal actions (#191)

The matching before/after screens show the same local synthetic A → B → A interaction while responses are held. Before, both joins and submissions send A, B, A, and only the most recently started card keeps its pending indicator. After, they send A, B; each card remains disabled until its own request settles.

At desktop 1440×1000 and mobile 390×844 the regression checks:

- A failed challenge B response re-enables B while A remains pending; A's later success remains visible when B is retried successfully.
- Event B succeeds while A remains pending. A then fails and can retry; B's submitted story stays visible throughout.
- The same pending card cannot send a duplicate request. Per-item synchronous guards also protect handlers before React renders the disabled state.

The `requests-*.json` files record the requests observed at each pending stage and after the explicit retries. The final successful sequence has six requests: challenge A once, challenge B twice, event B once and event A twice. Those extra B/A calls are deliberate retries after their failures, not concurrent duplicates.

The screenshots show the pending UI; the JSON and browser assertions establish request timing and mixed-response behavior. API responses and accounts are scoped synthetic local fixtures, with no production mutation. Mobile is a Chromium viewport; physical iPhone/Safari was not tested. Existing layout and card features are preserved.

With a disposable local frontend:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/growth-concurrent-actions.spec.ts
```

Optional `AUDIT_PROOF_DIR` saves matching screenshots and request observations. [Baseline failures](red.txt) → [passing desktop/mobile checks](green.txt).
