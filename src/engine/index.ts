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
 * `./policy.js` back to `./policy.ts` at build time.
 *
 * `0.0.1` is the shapes and the defaults. The reading itself — the wasm
 * glue, the worker pool, the GitHub fetching — lands next, unchanged from
 * where it runs today.
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
