import { band } from '../engine/index.js';

import { useEased } from './animate.js';

/**
 * A score, as a dial.
 *
 * Its own component because a score is the one thing about a repository that
 * anybody quotes — in a report, on a card, in a badge — and it should look
 * the same in all of them. Give it a title and a number:
 *
 *   <Score title="Containment" score={92} />
 *
 * Everything else it decides. The colour comes from the band the number
 * falls in, which is the same `band()` the scoring uses and the same three
 * tiers the legend names, so the dial cannot disagree with the legend or
 * with the score it is drawing.
 */
export type Band = 'pass' | 'warn' | 'fail';

/**
 * The legend, as classes.
 *
 * Exported because a host may want to colour something else — a table row, a
 * badge in its own header — by the same rule, and reimplementing the switch
 * is how two parts of one page end up disagreeing about what 89 means.
 */
export const BAND: Record<Band, { stroke: string; wash: string; ink: string; text: string }> = {
  pass: { stroke: 'stroke-green', wash: 'fill-green/10', ink: 'fill-green', text: 'text-green' },
  warn: { stroke: 'stroke-yellow', wash: 'fill-yellow/10', ink: 'fill-yellow', text: 'text-yellow' },
  fail: { stroke: 'stroke-red', wash: 'fill-red/10', ink: 'fill-red', text: 'text-red' },
};

export const toneOf = (score: number) => BAND[band(score) as Band] ?? BAND.pass;

export function Score({
  title,
  score,
  /** How much it moved, and since when. Both, or neither. */
  delta,
  since,
  onSelect,
}: {
  title: string;
  score: number;
  /** Null as well as absent: a caller reading a field that may be missing
   *  should not have to translate one kind of nothing into another. */
  delta?: number | null;
  since?: string | null;
  onSelect?: () => void;
}) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  // The arc and the figure both follow the sweep; the colour follows the
  // score itself, so a dial crossing a band changes colour when it earns it
  // rather than when the animation happens to pass the threshold.
  const swept = useEased(score);
  const tone = toneOf(score);
  const Tag = onSelect ? 'button' : 'div';

  return (
    <Tag
      className={
        'group flex flex-col items-center gap-[5px] border-0 bg-transparent p-0 ' +
        (onSelect ? 'cursor-pointer' : '')
      }
      onClick={onSelect}
    >
      <svg viewBox="0 0 62 62" className="block size-[62px]">
        {/* A wash of the band colour, so the score reads before the number. */}
        <circle className={tone.wash} cx="31" cy="31" r="28" />
        <circle
          className={`fill-none [stroke-width:4] opacity-35 transition-[stroke] duration-300 ${tone.stroke}`}
          cx="31"
          cy="31"
          r={r}
        />
        <circle
          className={`origin-center -rotate-90 fill-none [stroke-linecap:round] [stroke-width:4] transition-[stroke] duration-300 ${tone.stroke}`}
          cx="31"
          cy="31"
          r={r}
          strokeDasharray={circumference.toFixed(1)}
          strokeDashoffset={(circumference * (1 - swept / 100)).toFixed(2)}
        />
        <text
          className={`font-mono text-[19px] font-semibold transition-[fill] duration-300 [dominant-baseline:central] [text-anchor:middle] ${tone.ink}`}
          x="31"
          y="31"
        >
          {Math.round(swept)}
        </text>
      </svg>
      <span className="text-[12.5px] font-medium text-ink group-hover:text-accent">
        {title[0]?.toUpperCase()}
        {title.slice(1)}
      </span>
      {/* Reserved whether or not it has something to say. An unchanged score
          is the common case, so a line that appears only on movement makes
          most dials shorter than the rest and moves every one of them
          whenever a commit changes something. */}
      <span
        className={
          'min-h-[1.2em] font-mono text-[9.5px] tracking-[-0.01em] ' +
          (delta && delta > 0 ? 'text-green' : delta ? 'text-red' : 'text-ink-faint')
        }
      >
        {delta && since ? (
          <>
            {delta > 0 ? '+' : ''}
            {delta} since commit {since}
          </>
        ) : (
          ' '
        )}
      </span>
    </Tag>
  );
}
