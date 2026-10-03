# Reader reliability and touch interactions

This increment starts at production commit `7369d5fce8240836620c16f8af320460248955c6` (PR #154). It changes the React reader, application route identity and touch styles. It contains no backend, MongoDB index, schema, migration or API contract changes.

## Confirmed failures and fixes

| Trigger | Previous behavior | Result |
| --- | --- | --- |
| Open a chapter containing a block with an HTML `style` attribute | The custom reader renderer passed a string to React's `style` prop and crashed into the page error boundary. | Convert HTML attributes through `html-react-parser`'s `attributesToProps`; retain authored styles and classes. |
| Select chapter B while chapter A's progress-related account refresh is pending | The app read the changed browser URL as a new React key, remounted the reader with its older chapter A props, rewound the chapter and closed panels. | Capture the route key when the app processes a navigation event. Reader-local chapter URL replacement and account refreshes preserve the existing reader. Actual navigation and query changes still update the route key. |
| Chapter A's comments arrive after chapter B's comments | Chapter B displays A's discussion. | Ignore responses after their chapter effect is disposed, and load comments independently of reaction/statistics changes. |
| Chapter A's optimistic like fails after chapter B's body loads | Rolling back the entire captured book erases B's loaded manuscript. | Roll back only the reaction and its counts in current book state; display action errors only in the relevant chapter. |
| A comments request fails | The promise rejection is unhandled and the discussion falsely looks empty. | Keep reading available and show a local error with a comments retry button. |
| A comment is posted while an earlier comments GET is pending | The loading state hides the new comment, then the older response removes it. | Display successfully posted comments immediately. Merge only additions made during that active request, deduplicate server IDs, and release the additions on request completion/disposal. Subsequent fresh reads remain authoritative. |
| A touch reader scrolls down before using the bottom controls | The dock slides offscreen, leaving the discussion control outside the viewport. | Keep the dock stationary on coarse-pointer/hoverless devices. Focus mode continues to hide it and has a reachable exit control. |

Controls use `touch-action: manipulation`, preserving pan and pinch zoom while disabling double-tap zoom on controls. Touch devices get a subtle native tap highlight and reader-control press feedback. The dock's hover tooltips are disabled on touch devices; accessible button names are retained. Desktop hover, keyboard focus and reduced-motion behavior are preserved.

## Regression coverage

Each confirmed failure above was exercised before its fix. Tests intercept all API requests for controlled response ordering and failures, and use the real React application. The touch cases use native Playwright tap gestures rather than forced clicks.

- `e2e/reader-formatted-content.spec.ts`: styled headings, paragraphs, nested quotes and lists retain formatting; repeated single-tap chapter → story → catalog navigation.
- `e2e/reader-route-state.spec.ts`: a real frontend progress save starts an account refresh; its delayed response cannot rewind chapter B or dismiss open preferences.
- `e2e/reader-async-actions.spec.ts`: stale chapter discussion, narrow failed-like rollback, local retry after a 503, and immediate posting during an older pending comments read.
- `e2e/touch-reading-writing.spec.ts`: stationary controls after scrolling, chapter and paragraph discussion, focus-mode entry/exit, and writer comments/reply navigation while requests are delayed, without a document reload.

The full existing local browser suite also checks account, authentication/age access, reader progress, library/shelves, search/catalog restoration, writing/import/publish, community, notifications, settings, keyboard/dialog focus and responsive light/dark screens.

## Validation scope

Validation runs against the disposable local Spring/MongoDB runtime and isolated browser mocks. Test account changes and manuscript operations do not reach production. A separate anonymous, read-only production WebKit check completed four catalog → story → chapter → story → catalog cycles without a page error; the persistent failures required controlled formatted content or delayed signed-in responses to reproduce.

Automated WebKit checks exercise the relevant browser engine with a touch viewport, not the user's physical iPhone or its exact iOS release. These fixes address demonstrated causes; they do not establish that every intermittent error on the deployed site has the same cause. The new code must be deployed before evaluating its effect on that device.

With the disposable backend and Vite running, repeat the focused WebKit checks using `npx playwright install webkit` followed by:

```sh
npx playwright test --config=playwright.webkit.config.ts \
  e2e/reader-formatted-content.spec.ts e2e/reader-route-state.spec.ts \
  e2e/reader-async-actions.spec.ts e2e/touch-reading-writing.spec.ts \
  e2e/performance-ux.spec.ts
```

## Final results

| Check | Result |
| --- | --- |
| Frontend unit suite, `npm test` | 127 passed |
| Full Chromium local integration suite, `npm run test:e2e` | 174 passed |
| Focused WebKit suite using the committed configuration above | 14 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; 17 static public SEO pages and dynamic HTML/sitemap functions built |
| `npm run check:bundle` | Passed; initial JavaScript 161.04 kB gzip |
| `npm run test:seo` | 22 passed |
| Independent review of routing, access gates, touch/focus behavior and async state | No remaining actionable findings |

The backend source is unchanged; the full browser suite exercised its existing reader, account and writer APIs locally. This increment does not claim a new backend test run or a production-device test.
