import type { Finding as One } from '../engine/index.js';

import { Breakable } from './Breaks.js';

/**
 * One finding, shown the way a compiler shows one.
 *
 * A path and a line number is an index: it says a problem exists and leaves
 * the reader to go and find it. What a Rust developer expects instead is the
 * code, the part of it that is wrong, and what to do — so that is what this
 * shows, in the order rustc shows them.
 *
 * Not every rule points at a place. A file that is too long, a crate drawing
 * on too many others: those are true of the whole thing, and carry no span.
 * Rather than mark a column that means nothing, such a finding is just its
 * path and what was measured.
 */
export function Finding({ finding, remedy }: { finding: One; remedy?: string }) {
  // Shown without the indentation it happens to sit at. A line forty columns
  // deep would push its own code off the side of the card, and the span moves
  // with it so the marking still lands on the right characters.
  const lead = finding.text ? finding.text.length - finding.text.trimStart().length : 0;
  const code = finding.text?.slice(lead) ?? '';
  const [rawFrom, rawTo] = finding.col ?? [0, 0];
  const from = Math.max(0, rawFrom - lead);
  const to = Math.max(from, rawTo - lead);
  const span = Boolean(code) && to > from;

  return (
    <div className="border-l-2 border-rule pl-[11px]">
      <div className="flex flex-wrap items-baseline gap-[7px] font-mono text-[11.5px]">
        {/* One element: a gap between the path and its line number would read
            as two separate facts, and a reader copies the whole thing. */}
        <span className="text-ink-soft [overflow-wrap:anywhere]">
          <Breakable text={finding.file} />
          {finding.line ? (
            <span className="text-accent">
              :{finding.line}
              {span ? `:${rawFrom + 1}` : ''}
            </span>
          ) : null}
        </span>
        {!finding.text ? (
          <span className="text-ink-faint [overflow-wrap:anywhere]">
            <Breakable text={finding.what} />
          </span>
        ) : null}
      </div>

      {finding.text ? (
        <pre className="mt-[5px] overflow-x-auto whitespace-pre rounded-[5px] border border-rule-soft bg-panel px-2.5 py-[7px] font-mono text-[12px] leading-normal">
          <code className="text-ink">
            {/* Split so the part being complained about can be marked in
                place, rather than described underneath. */}
            {span ? (
              <>
                {code.slice(0, from)}
                <mark className="rounded-sm border-b-[1.5px] border-red bg-red/12 px-px text-red">{code.slice(from, to)}</mark>
                {code.slice(to)}
              </>
            ) : (
              code
            )}
          </code>
          <span className="mt-1 block whitespace-normal text-[11px] text-ink-faint">{finding.what}</span>
        </pre>
      ) : null}
    </div>
  );
}
