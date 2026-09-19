import type { Commit, Score as ScoreData } from '../../engine/index.js';

import { Score, toneOf } from '../Score.js';

import { H2, LEDE } from '../classes.js';

import { band } from '../../engine/index.js';
import { useEased } from '../animate.js';
import { RuleCard } from '../RuleCard.js';

const CATEGORY_MEANING: Record<string, string> = {
  quality:
    "Reinvention and silencing: the same thing written twice, and the compiler told not to mention it. These are the shapes code takes when it is written fast by many hands.",
  containment:
    "Whether an effect stays in the crate that should own it. A library reaching for the process is the clearest case — it takes a decision away from every caller.",
  security:
    "Reach that somebody else could steer. Not how much the code can do, but how much of what it does is decided at runtime by something outside it.",
  legibility:
    "How much of this codebase could be proved rather than guessed at. A measurement of certainty, not a judgement — but what a parser cannot follow, the next author cannot either.",
  modularity:
    "House standards rather than facts about good code. Measured across ripgrep, tokio and deno, file length tracks a project's habits, so these defaults are deliberately lenient and the thresholds are yours to set.",
};

export function ScoreLevel({
  score,
  commits,
  viewing,
  at,
  repo,
  onBackToHead,
  onJump,
}: {
  score: ScoreData;
  commits: Commit[];
  /** Which slot on the rail, or -1 for a commit the rail does not list. */
  viewing: number;
  /** The commit being looked at, which is the only name an off-rail one has. */
  at: string | null;
  /** `owner/name`, so a card can read the file its finding came from. */
  repo: string | null;
  onBackToHead: () => void;
  onJump: (level: string) => void;
}) {
  const head = viewing === 0;
  const commit = commits[viewing] ?? null;
  // Off the rail there is no predecessor to compare against — the store holds
  // the commit, not what came before it — so no movement is claimed.
  const previous = viewing < 0 ? null : (commits[viewing + 1] ?? null);
  // Every score on this page comes from the report, because the report is of
  // the commit being shown. The timeline is only consulted for what came
  // before it.
  const scores = score.scores;
  // A finding's file has to be read at the commit that was scored, or the
  // line numbers point into a different version of it. The rail's entry when
  // there is one; otherwise the only name an off-rail commit has.
  const sha = commits[viewing]?.sha ?? at;

  return (
    <div>
      <h2 className={H2}>CodeQuality Score</h2>
      {/* The same line at every commit, head included. Explaining the scoring
          only at head made that one page taller than all the others, so every
          step through the time machine moved the rings. */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2 font-mono text-[12px] text-ink-faint [&>b]:text-accent">
        viewing <b>{commit?.short ?? at ?? '—'}</b>
        {commit ? <> · {commit.subject}</> : at ? ' · not among the commits on the rail' : null}
        {/* Present at head too, just not offered: a button that appears only
            on older commits makes this line taller there, and moves every ring
            beneath it by four pixels on the way in and out. */}
        <button onClick={onBackToHead} style={head ? { visibility: 'hidden' } : undefined}>
          back to head
        </button>
      </div>

      <div className="mb-2.5 flex flex-wrap justify-center gap-[22px] border-b border-rule px-2.5 pb-7 pt-4">
        {Object.entries(scores).map(([category, value]) => (
          <Score
            key={category}
            title={category}
            score={value}
            delta={
              previous ? value - (previous.scores[category] ?? value) : null
            }
            since={previous?.short ?? null}
            onSelect={() =>
              document
                .getElementById(`cat-${category}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          />
        ))}
      </div>

      {Object.entries(scores).map(([category, value]) => {
        const rules = score.rules
          .filter((r) => r.category === category)
          .sort((a, b) => b.deducted - a.deducted);
        const lost = rules.reduce((a, r) => a + r.deducted, 0);
        return (
          <section
            className="border-t border-rule-soft pb-1 pt-[26px] first-of-type:border-t-0 wide:grid wide:grid-cols-2 wide:items-start wide:gap-x-[22px] wide:gap-y-[9px]"
            id={`cat-${category}`}
            key={category}
          >
            <div className="flex flex-wrap items-baseline gap-3 wide:col-span-2">
              <span
                className={`font-mono text-[26px] font-semibold leading-none ${toneOf(value).text}`}
              >
                {value}
              </span>
              <h3>
                {category[0]?.toUpperCase()}
                {category.slice(1)}
              </h3>
              <span className="ml-auto font-mono text-[11px] text-ink-faint">
                100 {lost > 0 ? `− ${lost.toFixed(1)}` : ""} ·{" "}
                {rules.filter((r) => r.deducted > 0).length} of {rules.length}{" "}
                rules degraded
              </span>
            </div>
            <p className="mb-3.5 mt-1.5 max-w-[68ch] text-[14px] text-ink-soft wide:col-span-2">
              {CATEGORY_MEANING[category] ?? ""}
            </p>
            {rules.map((rule) => (
              <RuleCard
                key={rule.rule}
                rule={rule}
                config={score.config.rules[rule.rule]}
                repo={repo}
                commit={sha}
              />
            ))}
          </section>
        );
      })}

      <div className="mx-auto mt-[26px] flex w-max justify-center gap-5 rounded-[7px] border border-rule-soft px-3.5 py-[9px] font-mono text-[11px] text-ink-faint">
        <span>
          <i className="mr-1.5 inline-block size-2 bg-red [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
          0–49
        </span>
        <span>
          <i className="mr-1.5 inline-block size-2 bg-yellow" />
          50–89
        </span>
        <span>
          <i className="mr-1.5 inline-block size-2 rounded-full bg-green" />
          90–100
        </span>
      </div>
    </div>
  );
}
