# @cqxai/kit

The shared engine behind [cqx.dev](https://cqx.dev) and the deka explorer.

Two sites render the same data and answer the same questions. The moment one
decides a repository opens on its latest release and the other opens on its
latest commit, they are different products that happen to share a name. This
package is where that decision lives, once.

```sh
npm install @cqxai/kit
```

```ts
import { policy, band } from '@cqxai/kit/engine';
import type { Dataset, Finding } from '@cqxai/kit/engine';

policy.opensAt;      // 'release' — a tag is a thing its authors chose
policy.readers;      // 4 — eight is not worth four more threads
policy.lanes;        // 12 — saturates an HTTP/2 connection to the CDN
band(74);            // 'warn'
```

## What is in it

**`@cqxai/kit/engine`** — everything the explorer knows that has nothing to do
with how it is drawn: the wasm glue, the worker pool, the GitHub fetching, the
store, the addressing, the search, and the shapes cqx emits (`Dataset`,
`Score`, `Rule`, `Finding`, `Package`, `FileNode`, `TypeDecl`, …). `policy`
holds every default the explorer has an opinion about, each documented with
the reason it is that number rather than another.

**`@cqxai/kit/ui`** — the explorer itself, as React components. Structure lives
here because it is the product: two deployments that disagree about where the
menu is, or how a rule card reads, are two tools.

**`@cqxai/kit/theme`** — the shared light/dark theme script, hook and toggle.

## Theme

In a Next.js app, place `<ThemeScript />` in the root layout's `<head>`, put
`<ThemeToggle />` where the button goes, and style your dark theme on
`[data-theme=dark]` or `.dark`:

```tsx
import { ThemeScript, ThemeToggle } from '@cqxai/kit/theme';

// Root layout:
<html><head><ThemeScript /></head><body><ThemeToggle />{children}</body></html>
```

The Sun and Moon SVG path data comes from Lucide:

```text
ISC License
Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

The path data is inlined so this package does not add a Lucide dependency.

**`@cqxai/kit/gh`** — a runtime-agnostic GitHub proxy: a function from a Request
to a Response, so a Cloudflare Worker and a Next route handler are each four
lines around it.

**`@cqxai/kit/brand`** — the palette, four-stripe mark, graph-paper grid, and
type scale, generated from [one source](src/brand/tokens.json). Web apps import
`@cqxai/kit/brand/brand.css`; React Native imports the object. See the
[brand contract and adoption examples](src/brand/README.md).

**`@cqxai/kit/workers/*`** — the analyse and read worker bodies.

## What a host supplies

Import the brand stylesheet for colour values, then keep the host's Tailwind
mapping from `--color-green` to `var(--green)` (and the other named colours).
The host still loads its fonts, supplies its report layout and motion rules,
and tells Tailwind to scan the package:

```css
@import "@cqxai/kit/brand/brand.css";
@source "../node_modules/@cqxai/kit/dist";
```

The brand stylesheet also supplies the six syntax colours read by the code viewer:

```css
--color-code-comment  --color-code-keyword  --color-code-string
--color-code-number   --color-code-type     --color-code-function
```

Hosts with their own palette can still supply these properties themselves.

## Changing the brand

Use Node 24 or later for development. Edit `src/brand/tokens.json`, run
`npm run brand`, and commit the source and generated `dist/brand` files
together. `npm run build` and `npm test` check the outputs before compiling;
they fail on drift instead of regenerating it. `npm run brand:check` runs
that check alone.

## Showing code

`RuleCard` reads a finding's file back out of the repository, at the commit
that was scored, and marks the span the rule pointed at. The highlighter is
highlight.js with the Rust grammar alone, chosen by measurement against
shiki, CodeMirror 6 and Monaco: it was correct on every construct tried and
costs 9.3 KB, where Monaco costs 470 KB and splits `'\''` at the escape.
Both editors draw only the rows on screen, which is also why the browser's own
find cannot see a line they have not drawn — and a report is a document.

## Licence

Apache-2.0
