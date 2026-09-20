'use client';

import type { LevelId } from '../../engine/index.js';

export type Rung = { id: LevelId; name: string };

/**
 * The elevation ladder, and the identity that arrives once the cover has gone.
 *
 * The row leaves the cover so that it can stick: a sticky box can only travel
 * inside its own parent, and inside the cover it had nowhere to go. Out here
 * it rides the whole page, which is the point — scrolling past the header
 * used to cost the reader their navigation entirely.
 *
 * The ladder is centred rather than parked after the avatar's gutter. Tying
 * it to the width of something beside it means a long enough repository name
 * decides where the navigation sits, and the name is the one thing on this
 * page nobody gets to choose.
 */
export function Tabs({
  repo,
  avatar,
  levels,
  current,
  onSelect,
  rowRef,
  nameRef,
  firstTabRef,
}: {
  repo: string;
  avatar: string;
  levels: Rung[];
  current: LevelId;
  onSelect: (id: LevelId) => void;
  rowRef: React.RefObject<HTMLDivElement | null>;
  nameRef: React.RefObject<HTMLSpanElement | null>;
  firstTabRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div
      ref={rowRef}
      data-cqx="tabs"
      data-parked="false"
      data-compact="false"
      className="group sticky top-[var(--head)] z-20 rounded-b-[3px] border border-t-rule-soft border-rule bg-panel data-[parked=true]:shadow-[0_1px_6px_rgba(0,0,0,.18)]"
    >
      {/* It lives in the gutter the full-size one vacates, and arrives only
          once that has actually happened — so the gutter is never empty and
          never holds two of the same face. */}
      <span data-cqx="compact" className="pointer-events-none absolute left-4 top-1/2 z-[1] flex translate-y-[calc(-50%+9px)] items-center gap-[9px] opacity-0 transition-[opacity,transform] duration-200 ease-out group-data-[compact=true]:translate-y-[-50%] group-data-[compact=true]:opacity-100 motion-reduce:transition-none max-side:hidden">
        <span className="box-border block h-7 w-7 rounded-full bg-white p-0.5">
          <img className="block h-full w-full rounded-full object-cover" src={avatar} alt="" />
        </span>
        <span
          ref={nameRef}
          className="overflow-hidden text-ellipsis whitespace-nowrap font-display text-[12px] font-bold tracking-[-0.01em] text-ink"
        >
          {repo}
        </span>
      </span>

      <div
        className="flex justify-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-side:justify-start max-side:pl-2"
        role="tablist"
      >
        {levels.map((rung, i) => {
          const here = rung.id === current;
          return (
            <button
              key={rung.id}
              ref={i === 0 ? firstTabRef : undefined}
              type="button"
              role="tab"
              aria-current={here}
              onClick={() => onSelect(rung.id)}
              className={`flex shrink-0 cursor-pointer items-baseline gap-1.5 whitespace-nowrap border-0 border-b-[3px] bg-transparent px-[13px] pb-[9px] pt-2.5 font-display text-[12.5px] font-semibold ${
                here ? 'border-b-accent text-accent' : 'border-b-transparent text-ink-soft'
              }`}
            >
              {/* The ladder, carried into the tab bar. An elevation is how far
                  back you are standing from the same repository, so the place
                  to choose one is the same place you choose anything else. */}
              <i
                className={`font-mono text-[9.5px] font-semibold not-italic tracking-[0.04em] ${
                  here ? 'text-accent' : 'text-ink-faint'
                }`}
              >
                {rung.id}
              </i>
              {rung.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
