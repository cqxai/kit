/**
 * The explorer, as components.
 *
 * Structure lives here because it is the product: two deployments of the
 * same tool that disagree about where the menu is, or whether the time
 * machine reads down or across, are two tools. Only the palette is the
 * deployment's own.
 *
 * ## What a host must provide
 *
 * These components name colours and faces rather than carrying them, so an
 * application supplies the values in its own Tailwind theme. The full
 * vocabulary is twelve colours and two faces:
 *
 *   ground  panel  ink  ink-soft  ink-faint
 *   rule  rule-soft  accent  button
 *   green  yellow  red
 *   font-display  font-mono
 *
 * and three lengths the layout is built from, as custom properties on
 * `:root`: `--head` (the header's height), `--rail` (the menu's column) and
 * `--report` (the widest the report may get).
 *
 * Six more are optional, and only the code viewer reads them:
 *
 *   --color-code-comment  --color-code-keyword  --color-code-string
 *   --color-code-number   --color-code-type     --color-code-function
 *
 * Leave them out and the code is legible, lit from the twelve above. Define
 * them and it is properly lit — a UI palette does not have enough hues for
 * syntax, and stretching it over six roles gives a muddy result.
 *
 * Tailwind must also be told to scan this package, or none of the utilities
 * these components name will be generated:
 *
 *   @source "../node_modules/@cqxai/kit/dist";
 *
 * Two breakpoints are assumed: `side`, where the menu becomes a column
 * beside the report, and `wide`, where the report itself holds two columns.
 */
/**
 * Two shells, one engine.
 *
 * `Report` is a repository at one commit, read once: the viewer the CLI opens
 * on a folder, a one-off report on a private repository, a directory somebody
 * exported. `Profile` is a repository somebody comes back to — a page with a
 * history, a feed and a front. They share `useRepo`, so they can never
 * disagree about which commit is being read.
 */
export { Report } from './Report.js';
/** @deprecated The report's name before there were two shells. */
export { Report as Explorer } from './Report.js';
export { Profile } from './profile/Profile.js';
export { useRepo, type Repo } from './useRepo.js';
export { Score, BAND, toneOf, type Band } from './Score.js';
export { ThemePicker } from './Theme.js';
export { Search, SearchButton, useSearchKey } from './Search.js';
export { ElevationRail, type Elevation } from './ElevationRail.js';
export { TimeMachine, type TimeMachineTab } from './TimeMachine.js';
export { Finding } from './Finding.js';
export { RuleCard } from './RuleCard.js';
export { Code, type CodeMark } from './Code.js';
export { EffectBadges } from './EffectBadges.js';
export { Graph, type GraphNode, type GraphEdge } from './Graph.js';
export { LevelView } from './LevelView.js';
export { Header } from './Header.js';
export * from './cards/index.js';
export { Analysing, Working, Phases } from './Loading.js';
export { RepoInput, asRepo } from './RepoInput.js';
export * as classes from './classes.js';
