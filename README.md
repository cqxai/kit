# cqx-kit

The shared engine behind [cqx.bio](https://cqx.bio) and the deka explorer.

Two sites render the same data and answer the same questions. The moment one
decides a repository opens on its latest release and the other opens on its
latest commit, they are different products that happen to share a name. This
package is where that decision lives, once.

```ts
import { policy, band } from 'cqx-kit/engine';
import type { Dataset, Finding } from 'cqx-kit/engine';

policy.opensAt;      // 'release' — a tag is a thing its authors chose
policy.readers;      // 4 — eight is not worth four more threads
policy.lanes;        // 12 — saturates an HTTP/2 connection to the CDN
band(74);            // 'warn'
```

## What is in it

**`cqx-kit/engine`** — everything the explorer knows that has nothing to do
with how it is drawn: the wasm glue, the worker pool, the GitHub fetching, the
store, the addressing, the search, and the shapes cqx emits (`Dataset`,
`Score`, `Rule`, `Finding`, `Package`, `FileNode`, `TypeDecl`, …). `policy`
holds every default the explorer has an opinion about, each documented with
the reason it is that number rather than another.

**`cqx-kit/ui`** — the explorer itself, as React components. Structure lives
here because it is the product: two deployments that disagree about where the
menu is, or how a rule card reads, are two tools.

**`cqx-kit/gh`** — a runtime-agnostic GitHub proxy: a function from a Request
to a Response, so a Cloudflare Worker and a Next route handler are each four
lines around it.

**`cqx-kit/workers/*`** — the analyse and read worker bodies.

## What a host supplies

Only the palette. These components name colours and faces rather than
carrying them, so an application supplies the values in its own Tailwind
theme — twelve colours, two faces, and three lengths. Tailwind must also be
told to scan the package, or none of the utilities are generated:

```css
@source "../node_modules/cqx-kit/dist";
```

Six more custom properties are optional, and only the code viewer reads them:

```css
--color-code-comment  --color-code-keyword  --color-code-string
--color-code-number   --color-code-type     --color-code-function
```

Leave them out and code is legible, lit from the twelve. Define them and it is
properly lit — a UI palette does not have enough hues for syntax, and
stretching it over six roles gives a muddy result.

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
