/**
 * Shapes that appear in more than one elevation, as class strings.
 *
 * Not a stylesheet. A stylesheet is what this replaced, and the reason it
 * was replaced is that a rule written in one file quietly outranked a rule
 * written in another — by specificity, or by being further down. Utilities
 * are all one specificity and their order is the framework's problem, so the
 * only way a class here can lose is if something after it in the same string
 * says otherwise, which is visible on the line.
 *
 * Shared as constants rather than as an `@apply` class for the same reason:
 * a constant is a value a component chooses to use and can add to, and it
 * cannot be overridden from somewhere the component does not mention.
 */

/** A level's title, and the sentence under it that says what it is for. */
export const H2 = 'mb-[3px] text-[24px] leading-tight tracking-[-0.02em] text-balance text-ink';
export const LEDE = 'mb-4 max-w-[66ch] text-[14px] text-ink-soft [overflow-wrap:anywhere]';

/** Nothing to show, said in the space the something would have taken. */
export const EMPTY =
  'rounded-lg border border-dashed border-rule px-[18px] py-[38px] text-center text-ink-soft';

/** A wall of small things, each worth clicking. */
export const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(204px,1fr))] gap-[9px]';
export const CARD = [
  'flex cursor-pointer flex-col gap-[7px] rounded-lg border border-rule-soft bg-panel',
  'px-3 py-[11px] text-left text-ink',
  'hover:border-button hover:bg-rule-soft',
].join(' ');
export const CARD_NAME = 'font-mono text-[13px] font-semibold [overflow-wrap:anywhere]';
export const CARD_META = 'flex gap-[9px] font-mono text-[11px] tabular-nums text-ink-soft';

/** A proportion, drawn rather than written. */
export const BAR = 'h-[3px] overflow-hidden rounded-sm bg-rule-soft';
export const BAR_FILL = 'block h-full bg-button';

/** A label over a group, in the same voice as the rail's headings. */
export const SECT =
  'mb-2 mt-[22px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-faint';

/** A table that may be wider than the column it is in. */
export const TABLE_WRAP = 'overflow-x-auto rounded-lg border border-rule-soft bg-panel';
export const TABLE = 'w-full border-collapse font-mono text-[12.5px]';
export const TH =
  'whitespace-nowrap border-b border-rule px-3 py-2 text-left text-[10px] uppercase tracking-[0.07em] text-ink-faint';
export const TD = 'border-b border-rule-soft px-3 py-1.5 align-top tabular-nums';

export const TR = 'hover:bg-rule-soft [&:last-child>td]:border-b-0';

/**
 * The row search sent you to.
 *
 * Marked rather than merely first: at the top of a list that is already
 * ordered, "first" is indistinguishable from "biggest".
 */
export const TR_FOUND = 'bg-yellow/10 [&>td:first-child]:shadow-[inset_2px_0_0_var(--color-button)]';

/** A run of findings under the rule that produced them. */
export const FINDINGS = 'mt-[9px] flex flex-col gap-2.5';

/** A word that is there to be read past, not read. */
export const DIM = 'text-ink-faint';
export const ACC = 'text-accent';
export const HOT = 'text-red';
export const LOC = 'whitespace-nowrap text-ink-faint';

/** Text that behaves like a link but is a button, because it moves the view
 *  rather than the document. */
export const JUMP = 'cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-accent hover:underline';
