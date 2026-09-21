// Generated from src/brand/tokens.json by src/brand/generate.ts. Do not edit; run npm run brand.

export declare const brand: {
  readonly "palette": {
    readonly "light": {
      readonly "ground": "#f6f2e7";
      readonly "panel": "#fbf8f0";
      readonly "screen": "#fdfcf8";
      readonly "ink": "#241c17";
      readonly "inkSoft": "#55483f";
      readonly "inkFaint": "#8a7b6d";
      readonly "green": "#2e7d5b";
      readonly "yellow": "#e0a72e";
      readonly "red": "#c03b2e";
      readonly "brown": "#8a5a3c";
      readonly "accent": "#c03b2e";
      readonly "rule": "#ded2bd";
      readonly "ruleSoft": "#e9dfcd";
      readonly "button": "#f0c14e";
      readonly "buttonInk": "#241c17";
      readonly "chip": "#211b16";
      readonly "chipFg": "#4ee08a";
      readonly "codeComment": "#9a8c7c";
      readonly "codeKeyword": "#9b3d6e";
      readonly "codeString": "#2e7d5b";
      readonly "codeNumber": "#a5651a";
      readonly "codeType": "#1d6a7a";
      readonly "codeFunction": "#3d5a9e";
      readonly "grid": "rgba(36, 28, 23, 0.022)";
    };
    readonly "dark": {
      readonly "ground": "#15161a";
      readonly "panel": "#1d1f24";
      readonly "screen": "#0e0f12";
      readonly "ink": "#f2ebdc";
      readonly "inkSoft": "#a9a08f";
      readonly "inkFaint": "#756c5f";
      readonly "green": "#3fa574";
      readonly "yellow": "#edbe52";
      readonly "red": "#e0594a";
      readonly "brown": "#a2704c";
      readonly "accent": "#e0594a";
      readonly "rule": "#2e3037";
      readonly "ruleSoft": "#232529";
      readonly "button": "#edbe52";
      readonly "buttonInk": "#15161a";
      readonly "chip": "#08090b";
      readonly "chipFg": "#4ee08a";
      readonly "codeComment": "#6d6558";
      readonly "codeKeyword": "#e48fb8";
      readonly "codeString": "#68c79a";
      readonly "codeNumber": "#e6b467";
      readonly "codeType": "#68c2d6";
      readonly "codeFunction": "#8fa9e8";
      readonly "grid": "rgba(242, 235, 220, 0.018)";
    };
  };
  readonly "stripe": {
    readonly "order": readonly ["green", "yellow", "red", "brown"];
    readonly "palette": {
      readonly "light": "dark";
      readonly "dark": "light";
    };
    readonly "position": "fixed";
    readonly "insetBlock": 0;
    readonly "left": 15;
    readonly "width": 23;
    readonly "display": "flex";
    readonly "bandFlex": 1;
    readonly "zIndex": 30;
    readonly "pointerEvents": "none";
    readonly "narrow": {
      readonly "maxWidth": 720;
      readonly "left": 6;
      readonly "width": 10;
    };
    readonly "insetReason": "Off the edge, not on it: the drawing leaves a strip of ground to the left of the margin, which is what stops it reading as browser chrome.";
  };
  readonly "grid": {
    readonly "color": {
      readonly "light": "rgba(36, 28, 23, 0.022)";
      readonly "dark": "rgba(242, 235, 220, 0.018)";
    };
    readonly "size": 28;
    readonly "lineWidth": 1;
  };
  readonly "typeScale": {
    readonly "body": {
      readonly "fontSize": 14;
      readonly "lineHeight": 23;
    };
    readonly "wordmark": {
      readonly "fontSize": 34;
      readonly "lineHeight": 42;
      readonly "letterSpacing": -1.5;
    };
    readonly "display": {
      readonly "fontWeight": 800;
      readonly "letterSpacingEm": -0.02;
    };
    readonly "cycle": {
      readonly "fontSizeEm": 0.74;
      readonly "fontWeight": 600;
      readonly "letterSpacingEm": -0.02;
    };
  };
};

export declare const palette: typeof brand.palette;
export declare const stripe: typeof brand.stripe;
export declare const grid: typeof brand.grid;
export declare const typeScale: typeof brand.typeScale;
export declare const light: typeof palette.light;
export declare const dark: typeof palette.dark;
export type Mode = keyof typeof palette;
export type ThemeColors = { [Key in keyof typeof light]: string };
