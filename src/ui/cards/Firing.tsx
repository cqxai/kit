'use client';

import type { Rule, RuleConfig } from '../../engine/index.js';
import { RuleCard } from '../RuleCard.js';

/**
 * A rule is costing this repository something, right now.
 *
 * Not an event in the way a commit is — it is a standing condition — but it
 * belongs in the same feed, because what a reader wants from a repository's
 * front page is "what is wrong with it" and "what changed", and separating
 * those puts the answer in two places.
 *
 * The rule card is not re-drawn here. It already says the rule's name, what
 * it measured, what it cost and where — and it already shows the code, which
 * is the part that makes a finding checkable rather than a claim. All a feed
 * adds is when, and which commit it is true of.
 */
export function FiringCard({
  rule,
  config,
  repo,
  at,
  when,
}: {
  rule: Rule;
  config?: RuleConfig;
  repo: string | null;
  at: string | null;
  when: string;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex flex-wrap items-center gap-2 px-1 font-mono text-[11px] text-ink-faint">
        <span className="text-ink-soft">firing</span>
        {at ? <span>at {at}</span> : null}
        <span aria-hidden="true">·</span>
        <span>{when}</span>
      </div>
      <RuleCard rule={rule} config={config} repo={repo} commit={at} />
    </div>
  );
}
