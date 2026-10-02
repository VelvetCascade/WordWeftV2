# Automatic homepage word and cover transition

This follow-up starts after the journey-quality checkpoint `4e826db8ca5d88ab87dae8f67ebe84e1ea64a08a`. Apply the earlier journey-quality patch and assets first, including when the locally applied checkpoint has a different commit ID.

The brown highlighted word automatically cycles through stories, novels and poems as the matching published covers change together. The highlight keeps its position and width while the outgoing word moves upward and the incoming word enters from below. The format selectors and Play/Pause control strip have been removed.

Reading or hovering over the left-hand copy allows the animation to continue. Hovering or keyboard-focusing a cover keeps its link stable until that interaction ends. Background tabs, an offscreen hero and reduced-motion preferences suspend automatic changes. Empty formats are skipped; a single populated format remains still. The accessible heading stays stable for screen-reader navigation.

Validation against the existing disposable local backend and MongoDB:

- 105 frontend tests passed.
- Typecheck, production build and bundle size check passed. The build includes 17 public pages and the dynamic HTML function; initial JavaScript is 160.37 kB gzip.
- Seven homepage journey checks passed, including a complete automatic cycle, corresponding published book links, fixed highlight geometry, hover/focus stability and resume, reduced motion, sparse/empty/error catalogs, genre artwork and tablet navigation.
- Five additional responsive, appearance and accessibility checks passed at 320, 390, 768 and 1440 pixels in light/dark appearance. All three words fit without horizontal overflow; the hero has no format buttons or tabs, and scoped axe checks have no violations.
- A real-time browser recording demonstrates stories → novels → poems → stories without manual selection. Six desktop/mobile screenshots and seven recorded observations confirm loaded actual catalog covers, matching words, no controls, no overflow and no browser errors. The desktop stories screenshot represents the return to the start of the cycle as well.

The separate [follow-up Drive delivery](https://drive.google.com/drive/folders/1LKVnhr085ACWyf50OLntoxMBUcihDx8u) contains the code patch, application instructions, recording and screenshots. The recording and screenshots are optional review files; applying this follow-up needs only its text patch. The original journey-quality delivery is retained unchanged.
