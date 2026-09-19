import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Code, with the part that is wrong marked in it.
 *
 * ## Why a highlighter at all, and why this one
 *
 * Five were measured against this exact job — the same finding, the same
 * slice, each built alone so the size is that renderer and nothing else:
 *
 *   naive regex     +0.5 KB   wrong on raw strings and numeric literals
 *   highlight.js    +9.3 KB   correct on every case tried
 *   shiki          +56.8 KB   correct, 12x the render time
 *   CodeMirror 6  +116.8 KB   correct, and virtualises
 *   Monaco        +469.8 KB   50x the size, and splits `'\''` at the escape
 *
 * The two editors draw only the rows on screen, which is what makes them
 * cheap on a whole file — and is also why the browser's own find cannot see
 * a line they have not drawn. A report is a document and people press
 * ctrl-F on it, so this renders every line of the slice.
 *
 * Writing the tokenizer here was the one option that was actually wrong: it
 * mis-read `r#"a "quoted" path"#` in the language cqx is written in.
 *
 * ## How the mark survives the highlighting
 *
 * The highlighted line is HTML, so splicing a `<mark>` into it at a column
 * would mean cutting markup at an offset that means nothing in it. Instead
 * the span is drawn *over* the line, positioned in `ch` units — exact in a
 * monospaced face — so the highlighter's output is never touched and the
 * mark cannot disagree with it.
 */

export interface CodeMark {
  /** The file line the mark sits on, counted as the file counts. */
  line: number;
  /** `[from, to)` within that line, as the parser counted columns. */
  col?: [number, number];
  /** What to say beneath it, in the voice rustc uses. */
  note?: string;
}

interface Highlighter {
  highlight(code: string, options: { language: string }): { value: string };
}

/** Loaded once per page, however many cards ask. */
let highlighter: Promise<Highlighter | null> | null = null;

function load(): Promise<Highlighter | null> {
  highlighter ??= Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/rust'),
  ])
    .then(([core, rust]) => {
      const hljs = core.default;
      hljs.registerLanguage('rust', rust.default);
      return hljs as Highlighter;
    })
    // A highlighter that will not load is a styling loss, not a content one:
    // the code is already on screen, uncoloured. Nothing above this needs to
    // know the difference.
    .catch(() => null);
  return highlighter;
}

/**
 * What the highlighter's classes mean, in colour.
 *
 * highlight.js emits `hljs-keyword` and the like and ships themes as
 * stylesheets; a component that only names Tailwind utilities has nowhere to
 * put one. So the mapping lives here, as the one style block this package
 * owns, scoped under a class nothing else uses — it cannot collide, and it
 * cannot be outranked by a host's sheet loading in a different order.
 *
 * Six roles, each an optional token with a fallback into the twelve colours
 * every host already supplies. Define none and the code is still readable;
 * define them and it is properly lit. A UI palette genuinely does not have
 * enough hues for syntax, and pretending otherwise gives a muddy result.
 */
const SHEET = `
.cqx-code {
  --kw: var(--color-code-keyword, var(--color-brown, currentColor));
  --str: var(--color-code-string, var(--color-green, currentColor));
  --num: var(--color-code-number, var(--color-yellow, currentColor));
  --ty: var(--color-code-type, var(--color-accent, currentColor));
  --fn: var(--color-code-function, currentColor);
  --cmt: var(--color-code-comment, var(--color-ink-faint, currentColor));
}
.cqx-code .hljs-comment, .cqx-code .hljs-quote { color: var(--cmt); font-style: italic; }
.cqx-code .hljs-doctag { color: var(--cmt); font-weight: 600; }
.cqx-code .hljs-keyword, .cqx-code .hljs-selector-tag, .cqx-code .hljs-literal,
.cqx-code .hljs-section, .cqx-code .hljs-operator { color: var(--kw); }
.cqx-code .hljs-string, .cqx-code .hljs-regexp, .cqx-code .hljs-addition,
.cqx-code .hljs-attribute, .cqx-code .hljs-meta .hljs-string { color: var(--str); }
.cqx-code .hljs-number, .cqx-code .hljs-bullet { color: var(--num); }
.cqx-code .hljs-type, .cqx-code .hljs-class .hljs-title,
.cqx-code .hljs-title.class_, .cqx-code .hljs-built_in { color: var(--ty); }
.cqx-code .hljs-title, .cqx-code .hljs-title.function_,
.cqx-code .hljs-name { color: var(--fn); font-weight: 500; }
.cqx-code .hljs-symbol, .cqx-code .hljs-variable, .cqx-code .hljs-template-variable,
.cqx-code .hljs-meta { color: var(--kw); opacity: .82; }
.cqx-code .hljs-emphasis { font-style: italic; }
.cqx-code .hljs-strong { font-weight: 600; }
`;

const STYLE_ID = 'cqx-code-theme';

/** Added once, by whichever card renders first. */
function dress() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SHEET;
  document.head.appendChild(style);
}

/** The gutter's own padding, in pixels: `pl-2.5` plus `pr-3`. */
const GUTTER_PAD = 22;

const TABS = /\t/g;
/** One tab is four columns here. The parser counts it as one, so any mark on
 *  a line containing tabs is shifted back by the difference. */
const TAB_WIDTH = 4;

export function Code({
  lines,
  startLine,
  mark,
  language = 'rust',
  className = '',
}: {
  /** The slice to draw, one string per line, already cut to the zoom. */
  lines: string[];
  /** The file line number of `lines[0]`. */
  startLine: number;
  mark?: CodeMark | null;
  language?: string;
  className?: string;
}) {
  const [hljs, setHljs] = useState<Highlighter | null>(null);
  const row = useRef<HTMLDivElement | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let live = true;
    dress();
    load().then((h) => {
      if (live) setHljs(h);
    });
    return () => {
      live = false;
    };
  }, []);

  // Common indentation is not information: a slice cut from inside an `impl`
  // is four columns deep on every line, and keeping it only pushes the code
  // off the side. Relative indentation, which is information, is kept.
  const { body, dedent } = useMemo(() => {
    let least = Infinity;
    for (const line of lines) {
      if (!line.trim()) continue;
      least = Math.min(least, line.length - line.trimStart().length);
    }
    const strip = Number.isFinite(least) ? least : 0;
    return {
      body: lines.map((l) => l.slice(strip).replace(TABS, ' '.repeat(TAB_WIDTH))),
      dedent: strip,
    };
  }, [lines]);

  // Highlighted as one block rather than line by line: a doc comment or a
  // multi-line string is one construct, and a highlighter shown one line of
  // it at a time gets it wrong in exactly the way this component exists to
  // avoid.
  const html = useMemo(() => {
    if (!hljs) return null;
    try {
      return hljs.highlight(body.join('\n'), { language }).value.split('\n');
    } catch {
      return null;
    }
  }, [hljs, body, language]);

  const width = String(startLine + lines.length - 1).length;

  // Put the marked line on screen whenever the slice changes, *inside this
  // viewer and nowhere else*.
  //
  // `scrollIntoView` was the obvious way and the wrong one: it scrolls every
  // scrollable ancestor, so each card dragged the whole page down to its own
  // code as it mounted — and then again when its file arrived. A reader got
  // the report yanked out from under them before they had read the score.
  // Moving `scrollTop` by hand can only ever move this box.
  useEffect(() => {
    const box = viewport.current;
    const hit = row.current;
    if (!box || !hit) return;
    // Nothing to do when everything already fits; setting scrollTop on a box
    // that does not scroll is a no-op, but computing it is not free.
    if (box.scrollHeight <= box.clientHeight) return;
    const outer = box.getBoundingClientRect();
    const inner = hit.getBoundingClientRect();
    const centred = inner.top - outer.top - (outer.height - inner.height) / 2;
    box.scrollTop = Math.max(0, box.scrollTop + centred);
  }, [startLine, lines.length, mark?.line, html]);

  return (
    <div
      ref={viewport}
      className={`cqx-code overflow-auto bg-ground font-mono text-[12px] leading-[1.55] ${className}`}
      // The gutter's width is its digits plus its own padding, because the
      // box includes the padding: asking for `${width}ch` and then padding it
      // gave a negative content box, and the numbers drew over the code.
      style={{ ['--gutter' as string]: `calc(${width}ch + ${GUTTER_PAD}px)` }}
    >
      <div className="w-max min-w-full py-2">
        {body.map((line, i) => {
          const number = startLine + i;
          const hit = mark?.line === number;
          return (
            <div key={number}>
              <div
                className={`flex ${hit ? 'bg-red/8 shadow-[inset_2px_0_0_var(--color-red)]' : ''}`}
                ref={hit ? row : undefined}
              >
                <span
                  className="shrink-0 select-none pl-2.5 pr-3 text-right text-ink-faint"
                  style={{ width: 'var(--gutter)' }}
                >
                  {number}
                </span>
                <span className="relative whitespace-pre pr-4 text-ink">
                  {html ? (
                    <span dangerouslySetInnerHTML={{ __html: html[i] ?? '' }} />
                  ) : (
                    line || ' '
                  )}
                  {hit ? <Marked line={line} mark={mark} dedent={dedent} /> : null}
                </span>
              </div>
              {hit && mark?.note ? <Caret line={line} mark={mark} dedent={dedent} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Where the mark lands, in columns of the line as drawn.
 *
 * Returns null when there is nothing to point at — a rule about a whole file
 * carries no span, and inventing one would point at code that is not the
 * problem.
 */
function columns(line: string, mark: CodeMark, dedent: number): [number, number] | null {
  if (!mark.col) return null;
  const [rawFrom, rawTo] = mark.col;
  if (rawTo <= rawFrom) return null;
  // A tab is one column to the parser and four here, so every tab before the
  // mark moves it right by three.
  const before = line.slice(0, Math.max(0, rawFrom - dedent));
  const shift = (before.match(TABS)?.length ?? 0) * (TAB_WIDTH - 1);
  const from = Math.max(0, rawFrom - dedent) + shift;
  const to = Math.max(from + 1, rawTo - dedent + shift);
  return [from, to];
}

/** The span itself, drawn over the highlighted line rather than inside it. */
function Marked({ line, mark, dedent }: { line: string; mark: CodeMark; dedent: number }) {
  const at = columns(line, mark, dedent);
  if (!at) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-0 h-full rounded-[2px] bg-red/14 shadow-[inset_0_-2px_0_var(--color-red)]"
      style={{ left: `${at[0]}ch`, width: `${at[1] - at[0]}ch` }}
    />
  );
}

/** What rustc would print under it. */
function Caret({ line, mark, dedent }: { line: string; mark: CodeMark; dedent: number }) {
  const at = columns(line, mark, dedent);
  return (
    <div className="flex text-ink-faint">
      <span className="shrink-0" style={{ width: 'var(--gutter)' }} />
      <span className="whitespace-pre pr-4">
        {at ? (
          <>
            {' '.repeat(at[0])}
            <span className="text-red">{'^'.repeat(at[1] - at[0])}</span>{' '}
          </>
        ) : null}
        {mark.note}
      </span>
    </div>
  );
}
