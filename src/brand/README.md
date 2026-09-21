# Brand contract

`tokens.json` is the source. `npm run brand` generates `dist/brand/brand.css`,
`index.js`, and its `index.d.ts` declaration. All three outputs are committed;
the build and CI reject missing or changed outputs. Generation is explicit so
the check cannot repair an edit before noticing it.

## Sources

These are existing values, not a new palette or a redesigned scale:

| Data | Source |
| --- | --- |
| Both palettes, including chip and syntax colours | [cqx-bio/app/globals.css](https://github.com/samifouad/cqx-bio/blob/main/app/globals.css) |
| Fixed stripe, 15px inset, 23px width, equal bands, 6px/10px at ≤720px | The same file's `.stripes` rules |
| Green, yellow, red, brown order | [cqx-bio/app/icon.svg](https://github.com/samifouad/cqx-bio/blob/main/app/icon.svg) and the issue #1 brief |
| Opposite-mode stripe palette and inset rationale | [Issue #1](https://github.com/samifouad/cqx-kit/issues/1) and its implementation brief |
| Grid colours, 28px square spacing, 1px lines | [cqx-desktop/src/app/globals.css](https://github.com/samifouad/cqx-desktop/blob/main/src/app/globals.css) |
| Camel-cased light/dark colour objects | [cqx-mobileapp/src/theme/colors.ts](https://github.com/samifouad/cqx-mobileapp/blob/main/src/theme/colors.ts) |
| Display weight/tracking and cycling-label size/weight/tracking | `cqx-bio/app/globals.css`, `.display` and `.cycle` |
| Body 14px/23px | [cqx-mobileapp/src/components/Type.tsx](https://github.com/samifouad/cqx-mobileapp/blob/main/src/components/Type.tsx) |
| Wordmark 34px/42px and -1.5px tracking | [cqx-mobileapp/src/components/BrandFrame.tsx](https://github.com/samifouad/cqx-mobileapp/blob/main/src/components/BrandFrame.tsx) |

The named palette files contain no complete font-size scale. `typeScale`
therefore records the existing mobile body/wordmark sizes alongside the CSS
display/cycle values. It does not introduce an interpolated scale. Numeric
lengths use the existing pixel/native style units; keys ending in `Em` are
relative to the current font size. Font loading remains the host's job.

## Web

```css
@import "cqx-kit/brand/brand.css";
```

The stylesheet defines the existing `--ground`, `--green`, `--ink-soft`, etc.,
plus `--color-code-*`. Light is the default; the OS preference selects dark
unless `data-theme="light"` is set on `<html>`. `data-theme="dark"` explicitly
selects dark. This matches `cqx-kit/ui`'s `ThemePicker` contract.

Tailwind hosts retain their `@theme inline` colour adapter and `@source`
directive. For example, `Glyph` in `src/ui/cards/Card.tsx` needs
`border-green/45 text-green`, and `src/ui/Search.tsx` also names green:

```css
@import "tailwindcss";
@import "cqx-kit/brand/brand.css";
@source "../node_modules/cqx-kit/dist";

@theme inline {
  --color-ground: var(--ground);
  --color-panel: var(--panel);
  --color-screen: var(--screen);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-green: var(--green);
  --color-yellow: var(--yellow);
  --color-red: var(--red);
  --color-brown: var(--brown);
  --color-accent: var(--accent);
  --color-rule: var(--rule);
  --color-rule-soft: var(--rule-soft);
  --color-button: var(--button);
  --color-button-ink: var(--button-ink);
  --color-chip: var(--chip);
  --color-chip-fg: var(--chip-fg);
}
```

Remove the host's duplicate palette declarations during adoption so they do
not override these values. Keep host-specific layout, font and animation
configuration. No host is migrated by this change.

The two opt-in classes apply the mark and grid using the generated properties:

```html
<body class="cqx-grid">
  <div class="cqx-stripes" aria-hidden="true">
    <span></span><span></span><span></span><span></span>
  </div>
</body>
```

`--band-green` through `--band-brown` use the **opposite** palette. Semantic
`--green`, `--yellow`, `--red`, and `--brown` follow the theme normally. The
stripe's inset is part of the mark: ground remains visible on its left so it
does not read as browser chrome. Both the responsive geometry and band order
are generated; hosts do not need a second copy of either rule.

Type variables follow `--type-<role>-<property>`, for example
`--type-body-font-size`, `--type-wordmark-line-height`, and
`--type-display-letter-spacing`. The stylesheet does not change the host's
text styles automatically.

## React Native

```ts
import { light, dark, palette, stripe, typeScale } from 'cqx-kit/brand';
import type { Mode, ThemeColors } from 'cqx-kit/brand';

const mode: Mode = 'dark'; // host theme state
const colors: ThemeColors = mode === 'dark' ? dark : light;
const stripeColors = stripe.order.map((name) => palette[stripe.palette[mode]][name]);
const bodyStyle = { ...typeScale.body, color: colors.ink };
```

`light`/`dark` keep the mobile colour names (`inkSoft`, `ruleSoft`,
`buttonInk`, `grid`, etc.). The module is plain ESM with no React, DOM, CSS,
Node, or JSON-loader runtime dependency. The aggregate `brand` export also
contains `palette`, `stripe`, `grid`, and `typeScale`.

Use `stripe.narrow` at widths ≤`stripe.narrow.maxWidth`, otherwise use
`stripe.left`/`stripe.width`. Native hosts that always use the compact mark
can choose `stripe.narrow` explicitly. Native positioning stays `absolute`
inside the host frame; `stripe.position: 'fixed'` records the web mark. Each
band uses `flex: stripe.bandFlex` and its corresponding `stripeColors` entry.
`grid.size` and `grid.lineWidth` are numeric, while `colors.grid` is the
mode-specific RGBA string. Hosts choose how to draw the grid on native.

`typeScale.display` and `typeScale.cycle` have relative `Em` values: convert
these using the chosen font size when applying native styles. The body and
wordmark styles already use numeric React Native style properties.
