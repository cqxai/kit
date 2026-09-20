'use client';

import type { Commit } from '../../engine/index.js';
import { Card, Glyph } from './Card.js';
import { Moves } from './Moves.js';

/** A commit landed. */
export function CommitCard({
  commit,
  when,
  onOpen,
  scored,
}: {
  commit: Commit;
  when: string;
  onOpen: (() => void) | null;
  /** Whether cqx has a report for this commit, which is not most of them. */
  scored: boolean;
}) {
  return (
    <Card
      id={`at-${commit.short}`}
      mark={<Glyph tone={scored ? 'green' : 'ink'}>{scored ? '◉' : '○'}</Glyph>}
      title={<span className="text-ink">{commit.subject || 'No message'}</span>}
      when={
        <>
          <span>{commit.author}</span>
          <span aria-hidden="true">·</span>
          <span>{when}</span>
          <span aria-hidden="true">·</span>
          <span className="text-ink-soft">{commit.short}</span>
        </>
      }
      chip={scored ? undefined : 'not scored'}
    >
      <Moves commit={commit} />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 cursor-pointer border-0 bg-transparent p-0 font-mono text-[11.5px] text-accent hover:underline"
        >
          Read the repository here →
        </button>
      ) : null}
    </Card>
  );
}
