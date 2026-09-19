import { useEffect, useMemo, useState } from 'react';

import type { Finding, Rule, RuleConfig } from '../engine/index.js';
import { sourceOf, sourceHeld } from '../engine/index.js';

import { Code } from './Code.js';

/**
 * One rule, and the code that cost it marks.
 *
 * The rule's name is the headline because it is the thing a reader will
 * learn, look up, argue with and eventually configure. It is written the way
 * it will be addressed for good — `rust/discarded-check` — so that the day a
 * second frontend lands, nothing shown here has to change its spelling.
 *
 * Hovering it gives the whole case: what the rule claims, the thresholds it
 * was measured against, **and where those thresholds came from**. A number a
 * reader cannot trace is a number they have to take on faith, and this tool
 * exists to be argued with. `RuleConfig.source` already carries the answer.
 *
 * The code is on screen at rest. A card that has to be opened before it says
 * anything is a list of file paths wearing a costume.
 */

type Zoom = 'line' | 'fn' | 'file';

/** How much of a line's neighbourhood is context rather than noise. */
const AROUND = 3;

/** A rule about a whole file points at no line, so the opening of it is the
 *  most useful thing to show: that is where a file says what it is. */
const HEAD = 14;

export function RuleCard({
  rule,
  config,
  repo,
  commit,
}: {
  rule: Rule;
  /** What this deployment was configured to expect, if it said. */
  config?: RuleConfig;
  /** `owner/name`, for reading the source back at the commit scored. */
  repo: string | null;
  /** The commit the report is of. Without it there is no file to read. */
  commit: string | null;
}) {
  const [pick, setPick] = useState(0);
  const [zoom, setZoom] = useState<Zoom>('line');
  const finding = rule.findings[pick] ?? rule.findings[0] ?? null;

  // The language prefixes the name everywhere and names its page in the
  // docs. Reports written before cqx had a second frontend do not say, and
  // there was only ever one thing they could mean.
  const language = rule.language ?? 'rust';
  const id = `${language}/${rule.rule}`;

  const [lines, setLines] = useState<string[] | null>(
    repo && commit && finding ? sourceHeld(repo, commit, finding.file) : null,
  );

  useEffect(() => {
    if (!repo || !commit || !finding) return;
    let live = true;
    setLines(sourceHeld(repo, commit, finding.file));
    sourceOf(repo, commit, finding.file).then((got) => {
      if (live) setLines(got);
    });
    return () => {
      live = false;
    };
  }, [repo, commit, finding?.file]);

  // A zoom the finding cannot support is not offered. `fn` needs the
  // enclosing item, which older reports do not carry; `file` needs the file.
  // A finding about a whole file — it is too long, it draws on too many
  // crates — points at no line, and marking one would point at code that is
  // not the problem.
  const pointed = Boolean(finding && finding.line > 0);

  const zooms = useMemo(() => {
    const out: { key: Zoom; label: string; note: string }[] = [
      pointed
        ? { key: 'line', label: 'line', note: finding ? String(finding.line) : '' }
        : { key: 'line', label: 'head', note: `first ${HEAD}` },
    ];
    if (finding?.item) {
      out.push({
        key: 'fn',
        label: finding.item.name,
        note: `${finding.item.to - finding.item.from + 1} lines`,
      });
    }
    if (lines) out.push({ key: 'file', label: 'file', note: `${lines.length} lines` });
    return out;
  }, [finding, lines, pointed]);

  const showing = zooms.some((z) => z.key === zoom) ? zoom : 'line';

  const slice = useMemo(() => {
    if (!finding) return null;
    // Until the file arrives there is still the one line the report carried,
    // which is the whole point of it travelling with the number.
    if (!lines) {
      return finding.text && pointed ? { body: [finding.text], start: finding.line } : null;
    }
    const last = lines.length;
    const range: [number, number] =
      showing === 'file'
        ? [1, last]
        : showing === 'fn' && finding.item
          ? [finding.item.from, finding.item.to]
          : pointed
            ? [finding.line - AROUND, finding.line + AROUND]
            : [1, HEAD];
    const from = Math.max(1, range[0]);
    const to = Math.min(last, range[1]);
    return { body: lines.slice(from - 1, to), start: from };
  }, [lines, finding, showing, pointed]);

  const hit = rule.deducted > 0;

  return (
    <div
      className={
        'rounded-lg border border-rule-soft border-l-[3px] bg-panel ' +
        // Quieter when it deducted nothing, said in colour rather than in
        // opacity: opacity makes a stacking context, and the intellisense
        // that hangs off the rule's name was inheriting it — a tooltip you
        // could read the page through.
        (hit ? 'border-l-red' : 'border-l-rule')
      }
    >
      <div className="px-[15px] pt-[13px]">
        <div className="mb-[5px] flex flex-wrap items-baseline gap-2.5">
          <RuleName id={id} rule={rule} config={config} language={language} quiet={!hit} />
          <span className="font-mono text-[11.5px] tabular-nums text-ink-soft">
            measured {rule.value.toFixed(2)}
            {config ? ` · free below ${config.free} · full at ${config.full}` : ''} · max{' '}
            {rule.weight}
          </span>
          <span
            className={
              'ml-auto font-mono text-[12.5px] ' +
              (hit ? 'font-semibold text-red' : 'text-ink-faint')
            }
          >
            {hit ? `−${rule.deducted.toFixed(1)}${rule.capped ? ' capped' : ''}` : 'no deduction'}
          </span>
        </div>
        <p className={`mb-2 max-w-[74ch] text-[13.5px] ${hit ? 'text-ink-soft' : 'text-ink-faint'}`}>
          {rule.describes}
        </p>
        {hit && rule.remedy ? (
          <p className="mb-2.5 max-w-[74ch] border-l-2 border-button pl-[13px] text-[13.5px] text-ink">
            {rule.remedy}
          </p>
        ) : null}
      </div>

      {finding ? (
        <div className="px-[15px] pb-[13px]">
          <Where
            rule={rule}
            pick={pick}
            onPick={(i) => {
              setPick(i);
              setZoom('line');
            }}
          />

          {slice ? (
            <>
              <div className="mb-[7px] mt-[9px] flex flex-wrap items-center gap-1.5">
                {zooms.map((z) => (
                  <button
                    key={z.key}
                    type="button"
                    aria-pressed={z.key === showing}
                    onClick={() => setZoom(z.key)}
                    className={
                      'rounded-[5px] border px-2 py-[3px] font-mono text-[11px] ' +
                      (z.key === showing
                        ? 'border-button bg-rule-soft text-ink'
                        : 'border-rule-soft text-ink-soft hover:border-button')
                    }
                  >
                    {z.label}
                    <span className="ml-1.5 text-ink-faint">{z.note}</span>
                  </button>
                ))}
                {!lines && repo && commit ? (
                  <span className="font-mono text-[11px] text-ink-faint">reading the file…</span>
                ) : null}
              </div>
              <div className="overflow-hidden rounded-[6px] border border-rule-soft">
                <Code
                  lines={slice.body}
                  startLine={slice.start}
                  language={language}
                  mark={pointed ? { line: finding.line, col: finding.col, note: finding.what } : null}
                  className={showing === 'file' ? 'max-h-[520px]' : 'max-h-[340px]'}
                />
              </div>
            </>
          ) : (
            <p className="mt-[9px] font-mono text-[11.5px] text-ink-faint">
              {finding.what}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The rule's name, and everything behind it on hover.
 *
 * Hover and focus both, because a name that only answers a mouse answers
 * half the people reading.
 */
function RuleName({
  id,
  rule,
  config,
  language,
  quiet,
}: {
  id: string;
  rule: Rule;
  config?: RuleConfig;
  language: string;
  /** The rule cost nothing, so its name should not compete with one that did. */
  quiet?: boolean;
}) {
  const params = Object.entries(config?.params ?? {});
  return (
    <span className="group relative">
      <button
        type="button"
        className={
          'cursor-help border-0 bg-transparent p-0 font-mono text-[13px] font-semibold underline decoration-rule decoration-dotted underline-offset-[3px] ' +
          (quiet ? 'text-ink-soft' : 'text-ink')
        }
      >
        [{id}]
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-[min(92vw,420px)] flex-col gap-2 rounded-lg border border-rule bg-ground p-3 text-left shadow-[0_10px_30px_rgba(0,0,0,0.35)] group-focus-within:flex group-hover:flex"
      >
        <span className="font-mono text-[12px] font-semibold text-ink">[{id}]</span>
        <span className="text-[12.5px] leading-snug text-ink-soft">{rule.describes}</span>
        <span className="flex flex-col gap-[3px] font-mono text-[11px] text-ink-soft">
          <span>
            <span className="text-ink-faint">category </span>
            {rule.category}
            <span className="text-ink-faint"> · weight </span>
            {rule.weight}
            {/* A rule that deducted nothing is not filed under an elevation,
                and printing the word with nothing after it reads as a bug. */}
            {rule.level ? (
              <>
                <span className="text-ink-faint"> · elevation </span>
                {rule.level}
              </>
            ) : null}
          </span>
          {config ? (
            <span>
              <span className="text-ink-faint">free below </span>
              {config.free}
              <span className="text-ink-faint"> · full at </span>
              {config.full}
              {/* Where the number came from, not just what it is. A threshold
                  a reader cannot trace is one they have to take on faith. */}
              <span className="text-ink-faint">
                {' · '}
                {config.source === 'default'
                  ? "cqx's default"
                  : config.source === 'config'
                    ? 'set in cqx.json'
                    : 'set in this environment'}
              </span>
            </span>
          ) : null}
          {params.map(([name, value]) => (
            <span key={name}>
              <span className="text-ink-faint">{name} </span>
              {value}
            </span>
          ))}
        </span>
        {config && config.source === 'default' ? (
          <span className="rounded-[5px] border border-rule-soft bg-panel px-2 py-[5px] font-mono text-[11px] text-ink-soft">
            cqx config set {rule.rule}.full {config.full}
          </span>
        ) : null}
        {/* Not a link yet: docs.cqx.bio does not exist, and a link that 404s
            teaches a reader to stop clicking them. */}
        <span className="font-mono text-[10.5px] text-ink-faint">
          docs.cqx.bio/{language}/{rule.rule}
        </span>
      </span>
    </span>
  );
}

/** Which finding is being shown, and what else there is. */
function Where({
  rule,
  pick,
  onPick,
}: {
  rule: Rule;
  pick: number;
  onPick: (i: number) => void;
}) {
  const more = rule.total_findings - rule.findings.length;
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[11.5px]">
      <span className="text-ink-faint">
        {rule.total_findings.toLocaleString()} finding{rule.total_findings === 1 ? '' : 's'}
      </span>
      {rule.findings.map((f, i) => (
        <button
          key={`${f.file}:${f.line}:${i}`}
          type="button"
          aria-pressed={i === pick}
          onClick={() => onPick(i)}
          className={
            'cursor-pointer border-0 bg-transparent p-0 font-[inherit] [overflow-wrap:anywhere] ' +
            (i === pick
              ? 'font-semibold text-ink underline decoration-red decoration-2 underline-offset-[3px]'
              : 'text-ink-soft hover:text-accent')
          }
        >
          {short(f)}
        </button>
      ))}
      {more > 0 ? <span className="text-ink-faint">… {more.toLocaleString()} more</span> : null}
    </div>
  );
}

/** A path short enough to sit in a row of them, and still be recognised. */
function short(f: Finding): string {
  const parts = f.file.split('/');
  const tail = parts.slice(-2).join('/');
  return f.line ? `${tail}:${f.line}` : tail;
}
