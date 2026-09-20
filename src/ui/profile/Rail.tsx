'use client';

import { useEffect, useState } from 'react';

import { day } from './Feed.js';

export type Stop = { id: string; label: string; when: string | null; tagged: boolean };

/**
 * The date menu, against the right edge.
 *
 * On the layout this borrows from it sat outside the content column, not
 * inside it — putting it in the card would make it part of the page rather
 * than a way around the page. So it is a sibling of the column, not a child.
 *
 * It follows the feed and the feed follows it. Which era is current is the
 * last one whose heading has passed the top of the window: scrolling up
 * through a tall card should not hand the mark back early. One position, not
 * a range — lighting up four at once says the reader is in four places.
 */
export function Rail({ stops }: { stops: Stop[] }) {
  const [here, setHere] = useState<string | null>(stops[0]?.id ?? null);

  useEffect(() => {
    const follow = () => {
      // At the foot of the page nothing below can ever reach the top, so the
      // last era would never be marked however far the reader scrolled. The
      // bottom of the document means the end of the timeline.
      if (innerHeight + scrollY >= document.body.scrollHeight - 4) {
        setHere(stops[stops.length - 1]?.id ?? null);
        return;
      }
      let current = stops[0]?.id ?? null;
      for (const stop of stops) {
        const el = document.getElementById(stop.id);
        if (el && el.getBoundingClientRect().top <= 140) current = stop.id;
      }
      setHere(current);
    };
    addEventListener('scroll', follow, { passive: true });
    follow();
    return () => removeEventListener('scroll', follow);
  }, [stops]);

  if (stops.length === 0) return null;

  return (
    <nav
      data-cqx="rail"
      className="sticky top-[calc(var(--head)+54px)] hidden self-start pl-2.5 side:block"
      aria-label="History"
    >
      <p className="m-0 mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
        History
      </p>
      <ul className="m-0 max-h-[62vh] list-none overflow-y-auto p-0 [scrollbar-width:thin]">
        {stops.map((stop) => {
          const current = stop.id === here;
          return (
            <li
              key={stop.id}
              aria-current={current}
              className={`border-l-2 ${
                current ? 'border-l-accent' : stop.tagged ? 'border-l-yellow' : 'border-l-rule'
              }`}
            >
              <a
                href={`#${stop.id}`}
                className={`block py-[3px] pl-[9px] font-mono text-[11px] leading-[1.3] no-underline hover:text-accent ${
                  current ? 'font-semibold text-ink' : 'text-ink-faint'
                }`}
              >
                {/* A tag is a name a commit happens to carry, so it takes
                    that commit's place rather than living in a list of its
                    own. */}
                <span className={stop.tagged ? 'font-semibold text-ink' : ''}>
                  {stop.tagged ? '▸ ' : ''}
                  {stop.label}
                </span>
                {stop.when ? (
                  <span className="block text-[9.5px] font-normal text-ink-faint opacity-80">
                    {day(stop.when)}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
