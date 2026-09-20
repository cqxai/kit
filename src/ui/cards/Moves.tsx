'use client';

import type { Commit } from '../../engine/index.js';

const NAME: Record<string, string> = {
  contained: 'Contained',
  legible: 'Legible',
  modular: 'Modular',
  quality: 'Quality',
  security: 'Security',
};

/**
 * What the score did, for the commits where that is known.
 *
 * Only the categories that actually moved. A row of five numbers of which
 * four are unchanged makes the reader do the subtraction to find the one that
 * matters, and the whole point of a feed is that it has already been done.
 *
 * Nothing at all when a commit was never scored — most of them, on most
 * repositories. An empty row saying "0" would claim the commit was measured
 * and found to change nothing, which is a different and untrue statement.
 */
export function Moves({ commit }: { commit: Commit | null }) {
  const moved = Object.entries(commit?.delta ?? {}).filter(([, d]) => d !== 0);
  if (moved.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px]">
      {moved.map(([key, d]) => (
        <span key={key} className="text-ink-faint">
          {NAME[key] ?? key}{' '}
          <b className={`font-semibold ${d > 0 ? 'text-green' : 'text-red'}`}>
            {d > 0 ? '+' : ''}
            {d}
          </b>
          {typeof commit?.scores[key] === 'number' ? (
            <span className="text-ink-soft"> → {commit.scores[key]}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
