import { useEffect, useRef, useState } from 'react';

import type { Stage } from '../engine/index.js';

/**
 * Seconds since a phase began.
 *
 * A bar that cannot say how far along it is can at least say how long it has
 * been going. makepad takes over two minutes to parse, and for all of it the
 * only honest thing to report is the clock.
 */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!running) {
      setSeconds(0);
      return;
    }
    from.current = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - from.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return seconds;
}

/**
 * Saying that something is happening, without taking the page away to say it.
 *
 * Two states, because there are two situations. With nothing on screen yet
 * there is room to explain what is going on and why. With a report already up,
 * replacing it would flash the whole of the page's content on every click — so
 * the report stays, and the notice sits above it.
 */

/** Done, and the tick that says so. */
function Tick() {
  return (
    <svg className="shrink-0 text-green" viewBox="0 0 16 16" aria-hidden="true" width="13" height="13">
      <path d="M2 8.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One row per phase.
 *
 * Reading the files and parsing them are different work taking different time
 * — deno spends thirteen seconds on the first and seven on the second — and a
 * single bar covering both says the wait is half what it is. The parse has no
 * progress to report, because it is one call into the module, so its bar says
 * that rather than inventing a number.
 */
function Phase({
  label,
  state,
  fraction,
  detail,
}: {
  label: string;
  state: 'waiting' | 'running' | 'done';
  fraction?: number;
  detail?: string;
}) {
  return (
    <div
      className={
        'flex items-center gap-[9px] leading-normal ' +
        (state === 'waiting' ? 'opacity-[0.42]' : '')
      }
    >
      <span className="min-w-[108px]">{label}</span>
      {state === 'done' ? (
        <Tick />
      ) : (
        // Three cases, and the widths must not fight. A measured phase sets
        // its own; a running phase of unknown length leaves it to the stylesheet
        // to animate — an inline width of zero here made that bar invisible,
        // which is what a hundred and thirty nine seconds of makepad looked
        // like; and a phase that has not started shows an empty track.
        <div
          className={
            'h-[3px] w-[110px] shrink-0 overflow-hidden rounded-sm bg-rule-soft ' +
            (fraction === undefined && state === 'running' ? 'relative' : '')
          }
        >
          {fraction !== undefined ? (
            <i className="block h-full bg-button" style={{ width: `${fraction * 100}%` }} />
          ) : state === 'running' ? (
            /* Reduced motion gets a full, still bar: "busy" without the
               sixty-times-a-second part. */
            <i className="absolute block h-full w-2/5 bg-button animate-slide motion-reduce:left-0 motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-50" />
          ) : (
            <i className="block h-full bg-button" style={{ width: 0 }} />
          )}
        </div>
      )}
      {detail ? (
        <span className="whitespace-nowrap text-[10.5px] text-ink-faint">{detail}</span>
      ) : null}
    </div>
  );
}

export function Phases({ stage }: { stage: Stage }) {
  const fetched = stage.phase === 'analysing';
  const reading: 'waiting' | 'running' | 'done' =
    stage.phase === 'listing' ? 'running' : fetched ? 'done' : 'running';
  return (
    <div className="flex flex-col gap-[11px]">
      <Phase
        label="fetching files"
        state={reading}
        fraction={stage.phase === 'fetching' && stage.total ? stage.done / stage.total : undefined}
        detail={
          stage.phase === 'fetching'
            ? `${stage.done} of ${stage.total}${stage.cached ? ` · ${stage.cached} cached` : ''}`
            : stage.phase === 'listing'
              ? 'reading the file list'
              : `${stage.total} files`
        }
      />
      <Analysis running={fetched} done={stage.done} total={stage.total} note={stage.note} />
    </div>
  );
}

/**
 * The parse, which now says how far along it is: the module is handed a
 * function and calls it as each file is done. The clock stays, because over
 * two minutes a fraction alone is not much comfort.
 */
function Analysis({
  running,
  done,
  total,
  note,
}: {
  running: boolean;
  done: number;
  total: number;
  note?: string;
}) {
  const seconds = useElapsed(running);
  const counting = total > 0 && done > 0;
  // Merging what the readers found, collecting what they wrote and scoring it
  // are steps with no files to count through. A bar sitting full with nothing
  // beside it looks stuck; saying which step it is does not.
  const where = note
    ? note
    : counting
      ? `${done.toLocaleString()} of ${total.toLocaleString()}`
      : `${total.toLocaleString()} files`;
  return (
    <Phase
      label="running analysis"
      state={running ? 'running' : 'waiting'}
      // Known only once the first file is through; until then there is
      // genuinely nothing to report and the bar says so.
      fraction={running && counting && !note ? Math.min(1, done / total) : undefined}
      detail={running ? `${where}${seconds > 2 ? ` · ${seconds}s` : ''}` : undefined}
    />
  );
}

/** The first commit of a repository nobody has published: nothing to keep. */
export function Analysing({ repo, at, stage }: { repo: string; at: string | null; stage: Stage }) {
  return (
    <div className="rounded-lg border border-dashed border-rule px-[18px] pb-[52px] pt-[46px] text-center text-ink-soft">
      <div className="mb-[26px] text-[15px] text-ink">One moment while we generate a report</div>
      <div className="mx-auto max-w-[340px] text-left font-mono text-[11.5px]">
        <Phases stage={stage} />
      </div>
    </div>
  );
}

/** A report is already up and a different commit is on its way. */
export function Working({ at, stage }: { at: string | null; stage: Stage }) {
  return (
    <div
      className="fixed bottom-7 left-1/2 z-40 flex max-w-[min(92vw,520px)] -translate-x-1/2 items-center gap-3 rounded-full border border-rule bg-panel px-4 py-[9px] font-mono text-[11.5px] text-ink-soft shadow-[0_6px_24px_rgb(0_0_0/0.13)] backdrop-blur-[6px] animate-rise motion-reduce:animate-none"
      role="status"
      aria-live="polite"
    >
      {at ? <span className="font-semibold text-ink">{at}</span> : null}
      <Phases stage={stage} />
    </div>
  );
}
