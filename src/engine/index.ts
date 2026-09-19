/**
 * The engine: everything the explorer knows that has nothing to do with how
 * it is drawn.
 *
 * No React, no framework, no DOM beyond what the browser gives every script.
 * Two consumers today — cqx.bio and the deka explorer — and a third coming,
 * the viewer the CLI opens for a folder on disk. What must never differ
 * between them is here; what may differ is not.
 *
 * Imports carry the `.js` extension deliberately: this ships as real ESM,
 * and Node resolves what is written rather than guessing. TypeScript maps
 * `./policy.js` back to `./policy.ts` at build time. The tsconfig resolves
 * as `nodenext` so that forgetting one is a compile error rather than a
 * runtime one — it shipped as a runtime one once.
 *
 * `0.1.0` is the whole reading: the wasm glue, the worker pool, the GitHub
 * fetching, the store, the addressing and the search. What is left in each
 * application is what it looks like, which is the part that may differ.
 */
export { policy, CQX_VERSION } from './policy.js';
export type { Policy } from './policy.js';

export type {
  Band,
  Finding,
  Rule,
  RuleConfig,
  Score,
  Commit,
  EffectKind,
  Package,
  FileNode,
  TypeDecl,
  TypePart,
  FunctionDecl,
  EffectRow,
  Analysis,
  Dataset,
} from './types.js';

export { band, EFFECT_LABEL, EFFECT_ORDER } from './types.js';

export { install, type Host } from './host.js';

// `cqx.js` is deliberately not re-exported. Its `Analysis` is the wasm
// instance wrapper and only the worker bodies ever hold one — and the name is
// already taken here by the record of what an analysis cost, which is part of
// every dataset. Two different things with one name in one barrel is a
// collision waiting for whoever imports the wrong one.

export {
  isInteresting,
  fetchTree,
  fetchSource,
  fetchCommits,
  fetchReleases,
  type Tree,
  type TreeEntry,
  type SourceFile,
  type Progress,
  type ReleaseRef,
} from './github.js';

export { useStore, loadIndex, loadDataset, type RepoIndex } from './store.js';

export { loadCatalog, type Catalog, type Brand } from './catalog.js';

export { liveDataset, liveIndex, type Stage } from './live.js';

export {
  defaultView,
  parsePath,
  toPath,
  sameView,
  type View,
  type LevelId,
} from './view.js';

export {
  buildIndex,
  search,
  KIND_ORDER,
  KIND_LABEL,
  type Index,
  type Hit,
  type HitKind,
} from './search.js';

export { pinned } from './focus.js';
