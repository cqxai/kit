'use client';

import { useMemo } from 'react';

import type { Commit, Dataset, ReleaseRef, View } from '../../engine/index.js';
import { ReleaseCard } from '../cards/Release.js';
import { CommitCard } from '../cards/Commit.js';
import { FiringCard } from '../cards/Firing.js';
import { FeedSkeleton } from './Skeleton.js';

/** One day, written the way a person says it. */
export const day = (iso: string): string =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });

const moment = (iso: string): string =>
  `${day(iso)} at ${new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

/**
 * An era: a run of commits belonging to one release.
 *
 * The heading is what the date menu scrolls to and what it highlights when
 * the reader scrolls there themselves. The topmost one drops its date,
 * because the card directly under it already carries the same one, and two
 * copies of the same date at the top of a page read as a mistake.
 */
type Entry =
  | { kind: 'release'; at: string; release: ReleaseRef; commit: Commit | null }
  | { kind: 'commit'; at: string; commit: Commit };

/**
 * One list, not two.
 *
 * Releases and commits were separate tabs and switching between them was
 * cumbersome: a reader had to know which kind of thing they were looking for
 * before they could look. A release is a commit that happens to carry a name,
 * so it takes that commit's place and shows the tag. Behind it, release is an
 * alias for tag.
 */
export function eras(timeline: Commit[], releases: ReleaseRef[] | null): {
  id: string;
  label: string;
  when: string | null;
  entries: Entry[];
}[] {
  const tagged = new Map((releases ?? []).filter((r) => r.sha).map((r) => [r.sha!.slice(0, 8), r]));
  const out: { id: string; label: string; when: string | null; entries: Entry[] }[] = [];
  let current: { id: string; label: string; when: string | null; entries: Entry[] } | null = null;

  for (const commit of timeline) {
    const release = tagged.get(commit.short);
    if (release || !current) {
      current = {
        id: `era-${(release?.tag ?? commit.short).replace(/[^\w.-]/g, '-')}`,
        label: release?.tag ?? 'Since the last release',
        // The era is dated by its newest entry, not by the tag: a tag cut
        // today from a commit written last month is an event of today.
        when: commit.date,
        entries: [],
      };
      out.push(current);
    }
    current.entries.push(
      release
        ? { kind: 'release', at: commit.short, release, commit }
        : { kind: 'commit', at: commit.short, commit },
    );
  }
  return out;
}

export function Feed({
  repo,
  avatar,
  timeline,
  releases,
  data,
  at,
  scored,
  waiting,
  onGo,
}: {
  repo: string;
  avatar: string;
  timeline: Commit[];
  releases: ReleaseRef[] | null;
  data: Dataset | null;
  at: string | null;
  /** The commits cqx has actually published a report for. */
  scored: Set<string>;
  /** The timeline has not arrived, so its absence means nothing yet. */
  waiting: boolean;
  onGo: (patch: Partial<View>) => void;
}) {
  const grouped = useMemo(() => eras(timeline, releases), [timeline, releases]);

  // The rules costing this repository the most, at the commit on screen. Not
  // every rule — a feed of forty standing conditions is a list, and a list is
  // what the elevations are for.
  const firing = useMemo(
    () =>
      (data?.score.rules ?? [])
        .filter((r) => r.deducted > 0 && r.findings.length > 0)
        .sort((a, b) => b.deducted - a.deducted)
        .slice(0, 3),
    [data],
  );

  // A repository with no history is a real answer and this used to give it
  // two seconds early, every time, to every repository — while the timeline
  // was still being fetched. A reader does not read that as "still working".
  if (grouped.length === 0) {
    if (waiting) return <FeedSkeleton />;
    return (
      <p className="rounded-[3px] border border-rule bg-panel px-4 py-6 text-center text-ink-faint">
        Nothing to show yet — this repository has no history here.
      </p>
    );
  }

  return (
    <>
      {grouped.map((era, i) => (
        <section key={era.id} id={era.id} className="scroll-mt-[calc(var(--cqx-head,var(--head))+62px)]">
          {/* A label centred on a rule. Both halves are flexible, so it
              centres on the line rather than sitting at a measured offset. */}
          <h3 className="m-0 mb-3 mt-[22px] flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint before:h-px before:flex-1 before:bg-rule before:content-[''] after:h-px after:flex-1 after:bg-rule after:content-[''] first:mt-0">
            <span className="shrink-0">
              {era.label}
              {/* The topmost heading drops its date: the card directly under
                  it carries the same one. */}
              {i > 0 && era.when ? ` · ${day(era.when)}` : ''}
            </span>
          </h3>

          {/* The findings sit under the newest heading, because that is what
              they are true of: the commit on screen. */}
          {i === 0
            ? firing.map((rule) => (
                <FiringCard
                  key={rule.rule}
                  rule={rule}
                  config={data?.score.config.rules[rule.rule]}
                  repo={repo}
                  at={at}
                  when={era.when ? day(era.when) : ''}
                />
              ))
            : null}

          {era.entries.map((entry) =>
            entry.kind === 'release' ? (
              <ReleaseCard
                key={entry.at}
                repo={repo}
                avatar={avatar}
                tag={entry.release.tag}
                at={entry.at}
                commit={entry.commit}
                when={moment(entry.commit?.date ?? entry.release.publishedAt)}
                onOpen={entry.at === at ? null : () => onGo({ ref: entry.at })}
              />
            ) : (
              <CommitCard
                key={entry.at}
                commit={entry.commit}
                when={moment(entry.commit.date)}
                scored={scored.has(entry.at)}
                onOpen={
                  entry.at === at || !scored.has(entry.at) ? null : () => onGo({ ref: entry.at })
                }
              />
            ),
          )}
        </section>
      ))}
    </>
  );
}
