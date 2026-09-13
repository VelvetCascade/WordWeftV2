/** Compiled at build time; preserve the existing application theme. */
module.exports = {
  "darkMode": "class",
  "theme": {
    "extend": {
      "fontFamily": {
        "sans": [
          "Inter",
          "sans-serif"
        ],
        "serif": [
          "Literata",
          "serif"
        ],
        "mono": [
          "JetBrains Mono",
          "monospace"
        ]
      },
      "colors": {
        "primary": "#5D4037",
        "accent": "#8D6E63",
        "background": "#FBF9F6",
        "surface": "#FFFFFF",
        "text-rich": "#4E342E",
        "text-body": "#795548",
        "dark-background": "#261F1D",
        "dark-surface": "#3E2723",
        "dark-surface-alt": "#4E342E",
        "dark-text-rich": "#EFEBE9",
        "dark-text-body": "#BCAAA4",
        "dark-border": "#5D4037",
        "success": "#689F38",
        "warning": "#FFA000",
        "danger": "#D32F2F"
      },
      "borderRadius": {
        "xl": "12px",
        "2xl": "16px",
        "3xl": "20px"
      },
      "boxShadow": {
        "soft": "0 4px 12px rgba(0, 0, 0, 0.05)",
        "lifted": "0 10px 25px rgba(0, 0, 0, 0.08)",
        "glow": "0 0 15px rgba(141, 110, 99, 0.3)"
      },
      "keyframes": {
        "gradient-shift": {
          "0%, 100%": {
            "backgroundPosition": "0% 50%"
          },
          "50%": {
            "backgroundPosition": "100% 50%"
          }
        },
        "ripple": {
          "to": {
            "transform": "scale(4)",
            "opacity": "0"
          }
        },
        "slide-in-bottom": {
          "0%": {
            "transform": "translateY(100%)",
            "opacity": "0"
          },
          "100%": {
            "transform": "translateY(0)",
            "opacity": "1"
          }
        },
        "highlight-fade": {
          "0%": {
            "backgroundColor": "rgba(255, 193, 7, 0.4)"
          },
          "100%": {
            "backgroundColor": "transparent"
          }
        }
      },
      "animation": {
        "gradient-shift": "gradient-shift 10s ease infinite",
        "ripple": "ripple 0.6s linear",
        "slide-in-bottom": "slide-in-bottom 0.3s ease-out forwards",
        "highlight": "highlight-fade 2s ease-out forwards"
      }
    }
  },
  "content": [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.tsx",
    "./contexts/**/*.tsx",
    "./utils/**/*.ts",
    "./seo/**/*.{mjs,tsx}"
  ]
};
