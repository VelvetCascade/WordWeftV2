# Chapter-sharing proof (#196)

Before, Share Chapter generated `/book/local-story-spring`. After, clipboard, native sharing and X/Facebook/WhatsApp/Telegram preserve `/book/local-story-spring/chapter/local-story-spring-chapter-1`. Selected quotes retain the chapter; Share Book remains book-level. The canonical helper uses the chapter ID, independent of its position or title, and is shared by reader, chapter-management and editor publication sharing through `ShareModal`.

Synthetic local fixtures only. Start the frontend and disposable backend with published `local-story-spring` chapters 1 and 2, plus reader/writer accounts. Run:

```sh
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/196/after node scripts/audit/chapter-sharing.mjs
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/196/after node scripts/audit/chapter-editor-sharing.mjs
```

Optional `E2E_READER_EMAIL`, `E2E_WRITER_EMAIL`, and `E2E_PASSWORD` select fixture credentials. Browser launch uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, compatibility `CHROMIUM_PATH`, installed system Chromium, then Playwright's managed browser. Install managed Chromium with `npx playwright install chromium` when needed.

The browser check intercepts native share, clipboard and external windows; nothing is sent to social platforms. It checks 390/1440px, quote/book distinctions, signed-out public chapter access and the existing chapter-2 sign-in gate, authenticated reader/author chapter access, and the real chapter-management share action. The second script exercises the real editor publication-success → Share this Chapter UI with synthetic save/release/comparison responses; no chapter is modified or published. Recipient and chapter-management checks use the real backend and existing access controls. Native iPhone/Safari was not tested.

`before/390-chapter.png` and `after/390-chapter.png` show the same chapter-sharing dialog before/after. The original production browser assertion failed because the link lacked the chapter path; the fixed script passes. `after/channels.json` records the checked contexts. Full unit tests, typecheck and production/SEO build results are recorded in the PR.
