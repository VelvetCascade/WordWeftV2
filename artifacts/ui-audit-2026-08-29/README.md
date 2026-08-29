# WordWeft cross-device UI audit — 2026-08-29

## Coverage

- Public routes exercised in the in-app browser: home, features, library/category, book detail, reader, community, contact, feedback, and authentication.
- Responsive widths exercised: 320, 390, 768, 1024, and 1440 pixels.
- Both site themes exercised, including the independent light reader theme while the site remains dark.
- Static source review covered the protected writer dashboard, create-story, manage-chapters, and chapter-editor layouts.

## Implemented fixes

1. Removed the global 320-pixel minimum body width that caused a real horizontal scrollbar on narrow phones.
2. Moved the desktop navigation breakpoint to 1024 pixels so tablet layouts use the simpler top bar and bottom navigation instead of a crowded desktop header.
3. Reserved tablet hero space below the fixed top bar so the home headline is no longer clipped.
4. Stacked the book-detail sticky header below the global header on phone, tablet, and desktop, keeping Back, Report, Share, and Bookmark visible while scrolling.
5. Rebuilt the book-detail header grid so long titles shrink/wrap without pushing controls off-screen.
6. Added readable light/dark header colors and hover states for book-detail navigation and icons.
7. Restored the full book description as the summary source and added an accessible mobile “Read full summary” / “Show less” control.
8. Reworked the mobile story hero: smaller cover, resilient title sizing, compact facts, responsive tabs, and stable action layout.
9. Reflowed chapter rows on phones so progress, views, likes, comments, long titles, locks, and read arrows do not collide.
10. Added keyboard-accessible chapter titles and meaningful like/rating labels and pressed states.
11. Decoupled reader colors from the site theme, fixing the invisible Back control when the site is dark but the reader is Paper or Sepia.
12. Restored Narrow, Standard, and Wide reader widths that were being overridden by legacy page rules.
13. Corrected reader manuscript padding at desktop/mobile sizes and preserved the focus-mode layout.
14. Increased reader header and bottom-dock touch targets to at least 44 by 44 pixels.
15. Added accessible names to reader contents, previous, next, appearance, discussion, and focus controls.
16. Replaced the text-symbol report control with a real icon from the project’s icon library.
17. Added a keyboard-accessible way to open individual reader discussions.
18. Improved light/dark muted-text tokens and specific low-contrast copy on auth and feedback screens.
19. Added a theme-aware on-brand foreground token so peach/dark-theme action buttons no longer use low-contrast white text.
20. Applied dark-mode value, placeholder, and caret colors to native inputs, selects, and textareas.
21. Fixed the 320-pixel feedback tag-entry row by allowing the input to shrink and stacking its button.
22. Added names and pressed states to the library grid/list controls, plus labels for filter removal and drawer close actions.
23. Made home genre cards and the writer “Start a new story” card keyboard operable with visible focus treatment.
24. Reworked mobile writer navigation, create-story actions, editor controls, and safe-area spacing.
25. Reworked manage-chapter cards so long titles wrap and edit/publish/share/delete actions form a stable two-column phone grid.
26. Added reduced-motion fallbacks for global scrolling, card lifts, reader chrome, and cover transitions.

## Accepted visual evidence

1. `03-mobile-reader-light-site-dark.png` — healthy: Paper reader remains legible inside dark site state; header, report icon, and 44-pixel dock controls are visible.
2. `04-desktop-book-light.png` — healthy: desktop story composition, sticky controls, cover, title, metadata, and summary align cleanly.
3. `06-tablet-home-light-fixed.png` — healthy: tablet uses the simplified shell; headline clears the top bar and the bottom navigation does not overlap the hero.
4. `08-mobile-book-dark-stacked-header.png` — healthy: dark mobile global and story headers stack without overlap; Back and all right-side actions remain visible.
5. `09-small-mobile-feedback-dark.png` — healthy: the 320-pixel form has no horizontal overflow and its copy/section numbering remains readable.

## Verification notes

- Production Vite build completes successfully.
- Browser matrix found no document-level horizontal overflow and no visible unnamed buttons on the audited public routes at the tested widths.
- The mobile full-summary interaction was verified against a 280-character description: five-line collapsed state, full expanded state, and reversible label.
- TypeScript’s project-wide `--noEmit` check still reports pre-existing errors in TipTap extension declarations and `utils/autoLinker.ts`; none are in the files changed by this UI pass.
- Protected writer screens could not be live-screen tested because the active API session had no valid signed-in writer account. Their responsive source changes were production-built and reviewed statically.
