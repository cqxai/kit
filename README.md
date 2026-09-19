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

**`cqx-kit/engine`**

- `policy` — every default the explorer has an opinion about, each one
  documented with the reason it is that number rather than another.
- The shapes cqx emits: `Dataset`, `Score`, `Rule`, `Finding`, `Package`,
  `FileNode`, `TypeDecl`, `FunctionDecl`, `EffectRow`, and the rest.
- `band`, `EFFECT_LABEL`, `EFFECT_ORDER` — the small shared judgements about
  how a number and an effect are read.

## What is coming

The reading itself: the wasm glue, the worker pool that divides a large
repository between threads, and the GitHub fetching. It runs today inside the
explorer and moves here unchanged, so that a third consumer — the viewer the
cqx CLI opens for a folder on disk — gets it for free.

## Licence

Apache-2.0
