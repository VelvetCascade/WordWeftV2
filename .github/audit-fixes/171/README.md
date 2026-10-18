# #171 — responsive chapter header

Before, the 820px long title extended 122px into the action group despite zero document overflow. After, both context tracks can shrink and the title truncates within its actual grid track. The full title remains in the chapter heading and the header title tooltip. At 721–767px, the compact header hid Share while the More button was also hidden; the More menu now covers that existing breakpoint gap.

| Viewport | Before | After |
| --- | --- | --- |
| 820×600 | [Before](before-820.png) · [bounds](before-820-bounds.json) | [After](after-820.png) · [bounds](after-820-bounds.json) |
| 744×600 | [Before](before-744-keyboard.png) | [After](after-744-keyboard.png) |
| 390×844 | [Before](before-390.png) | [After](after-390.png) |
| 1440×600 | [Before](before-1440.png) | [After](after-1440.png) |

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- e2e/audit-171-reader-header.spec.ts
```

The real reader is mounted with synthetic story/chapter API fixtures. Geometry checks cover 720, 744, 768, 820, 912, 980, 1024 and 1440px with short, 100+ character, unbroken, Unicode and RTL titles. Keyboard and touch-context tests open sharing at 744px, enter/exit focus mode and return to the story. Chromium viewport/touch emulation is not proof on a physical device/native Safari.
