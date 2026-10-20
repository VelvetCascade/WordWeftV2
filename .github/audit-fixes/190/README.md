# Available post format contrast (#190)

Before → after uses the same synthetic composer with no circle selected in Light/Dark, at 1440×1000 and 390×844. The only application change removes reduced opacity from actionable outlined formats. The dashed border, selected format, discovery guidance, and suitable-circle actions are preserved.

Baseline: all four browser cases fail the rendered-label contrast assertion (and Light fails axe color-contrast). After: the minimum sampled ratio is 6.74:1 in Light and 8.14:1 in Dark, with zero scoped axe violations. The sampler composites rendered colors and the button's opacity; axe independently checks actual painted contrast. JSON beside each screenshot records the samples and axe result.

Browser checks also activate an outlined format with Enter, switch to a suggested circle, then switch to an incompatible circle and rediscover a suitable one. A separate Chromium touch-emulation case uses taps at 390px. Physical iPhone/Safari was not tested.

With a disposable local frontend:

```sh
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/community-format-contrast.spec.ts
```

Optional `AUDIT_PROOF_DIR` saves matching screenshots and measurements. The test supplies scoped synthetic API responses; no external account or mutation is involved. See [baseline failure](red.txt), [four passing contrast cases](green.txt), and [touch discovery](touch.txt).
