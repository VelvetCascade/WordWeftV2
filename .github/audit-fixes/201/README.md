# Keyboard quotation sharing (#201)

Selection changes in the chapter prose now expose the existing quote action independently of mouse events. Tab from a valid selection reaches the action and Enter/Space can activate its normal click handler. The shared dialog restores focus to the selected passage. Pointer selection uses the same single action; browser selectionchange also handles touch selection updates, without a physical-device claim. Selections over 280 characters explain the limit. Clear, outside-prose and chapter changes clear old quote state.

```sh
E2E_BASE_URL=http://127.0.0.1:3022 AUDIT_EVIDENCE=.github/audit-fixes/201/after node scripts/audit/keyboard-quote.mjs
```

Use canonical public chapter `local-story-spring-chapter-1`. The real reader is checked at 390/1440px. A browser range is prepared and extended with a real Shift+ArrowRight key; Tab/Enter, Escape, focus return, pointer activation, invalid selections and navigation use the actual UI. The production assertion fails with 81 selected characters and zero quote controls; the fixed run sees exactly one. Matching screenshots show that selection before/after, followed by the keyboard-opened dialog. No external share, native touch delivery or physical iPhone/Safari test occurred.

Browser selection uses `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, compatibility `CHROMIUM_PATH`, installed system Chromium, then Playwright-managed Chromium (`npx playwright install chromium`).
