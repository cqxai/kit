// Generated from src/brand/tokens.json by src/brand/generate.ts. Do not edit; run npm run brand.

export const brand = {
  "palette": {
    "light": {
      "ground": "#f6f2e7",
      "panel": "#fbf8f0",
      "screen": "#fdfcf8",
      "ink": "#241c17",
      "inkSoft": "#55483f",
      "inkFaint": "#8a7b6d",
      "green": "#2e7d5b",
      "yellow": "#e0a72e",
      "red": "#c03b2e",
      "brown": "#8a5a3c",
      "accent": "#c03b2e",
      "rule": "#ded2bd",
      "ruleSoft": "#e9dfcd",
      "button": "#f0c14e",
      "buttonInk": "#241c17",
      "chip": "#211b16",
      "chipFg": "#4ee08a",
      "codeComment": "#9a8c7c",
      "codeKeyword": "#9b3d6e",
      "codeString": "#2e7d5b",
      "codeNumber": "#a5651a",
      "codeType": "#1d6a7a",
      "codeFunction": "#3d5a9e",
      "grid": "rgba(36, 28, 23, 0.022)"
    },
    "dark": {
      "ground": "#15161a",
      "panel": "#1d1f24",
      "screen": "#0e0f12",
      "ink": "#f2ebdc",
      "inkSoft": "#a9a08f",
      "inkFaint": "#756c5f",
      "green": "#3fa574",
      "yellow": "#edbe52",
      "red": "#e0594a",
      "brown": "#a2704c",
      "accent": "#e0594a",
      "rule": "#2e3037",
      "ruleSoft": "#232529",
      "button": "#edbe52",
      "buttonInk": "#15161a",
      "chip": "#08090b",
      "chipFg": "#4ee08a",
      "codeComment": "#6d6558",
      "codeKeyword": "#e48fb8",
      "codeString": "#68c79a",
      "codeNumber": "#e6b467",
      "codeType": "#68c2d6",
      "codeFunction": "#8fa9e8",
      "grid": "rgba(242, 235, 220, 0.018)"
    }
  },
  "stripe": {
    "order": [
      "green",
      "yellow",
      "red",
      "brown"
    ],
    "palette": {
      "light": "dark",
      "dark": "light"
    },
    "position": "fixed",
    "insetBlock": 0,
    "left": 0,
    "width": 23,
    "display": "flex",
    "bandFlex": 1,
    "zIndex": 30,
    "pointerEvents": "none",
    "narrow": {
      "maxWidth": 720,
      "left": 0,
      "width": 10
    },
    "placementReason": "The stripe is flush with the left edge because the desktop app is the standard."
  },
  "grid": {
    "color": {
      "light": "rgba(36, 28, 23, 0.022)",
      "dark": "rgba(242, 235, 220, 0.018)"
    },
    "size": 28,
    "lineWidth": 1
  },
  "typeScale": {
    "body": {
      "fontSize": 14,
      "lineHeight": 23
    },
    "wordmark": {
      "fontSize": 34,
      "lineHeight": 42,
      "letterSpacing": -1.5
    },
    "display": {
      "fontWeight": 800,
      "letterSpacingEm": -0.02
    },
    "cycle": {
      "fontSizeEm": 0.74,
      "fontWeight": 600,
      "letterSpacingEm": -0.02
    }
  }
};

export const palette = brand.palette;
export const stripe = brand.stripe;
export const grid = brand.grid;
export const typeScale = brand.typeScale;
export const light = palette.light;
export const dark = palette.dark;
