'use client';

import type { Commit } from '../../engine/index.js';
import { Card, Face } from './Card.js';
import { Moves } from './Moves.js';

/**
 * A tag went out.
 *
 * A release is not an event of its own on this page: it is a commit that
 * happens to carry a name. So it takes that commit's place in the feed rather
 * than living in a list beside it, which is what made the old two-tab
 * arrangement cumbersome — the reader had to know which list a thing was on
 * before they could look for it.
 */
export function ReleaseCard({
  repo,
  avatar,
  tag,
  at,
  commit,
  when,
  onOpen,
}: {
  repo: string;
  avatar: string;
  tag: string;
  at: string | null;
  commit: Commit | null;
  when: string;
  onOpen: (() => void) | null;
}) {
  return (
    <Card
      id={at ? `at-${at}` : undefined}
      mark={<Face src={avatar} />}
      title={
        <>
          <b className="font-semibold">{repo}</b> released{' '}
          <b className="font-semibold text-accent">{tag}</b>
        </>
      }
      when={when}
      chip="release"
    >
      {commit?.subject ? <p className="m-0 mb-2 text-ink">{commit.subject}</p> : null}
      <Moves commit={commit} />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-2 cursor-pointer border-0 bg-transparent p-0 font-mono text-[11.5px] text-accent hover:underline"
        >
          Read the repository at {at} →
        </button>
      ) : null}
    </Card>
  );
}
