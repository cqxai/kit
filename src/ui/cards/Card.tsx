'use client';

import type { ReactNode } from 'react';

/**
 * The shape every entry in a feed shares.
 *
 * Cards live here rather than under the profile because the report will want
 * them too. A report is one commit read once and a profile is a repository
 * come back to, but "a release went out and the score moved" is the same
 * sentence in both, and it should not be written twice. The two shells
 * disagree about the page, not about what an event looks like.
 *
 * What a card is: a mark, a line saying what happened and when, a body, and
 * — sometimes — a footer of things to do about it. Nothing else is shared,
 * because everything else is the specific event.
 */
export function Card({
  mark,
  title,
  when,
  chip,
  children,
  footer,
  id,
}: {
  /** The face or glyph the event belongs to. */
  mark: ReactNode;
  title: ReactNode;
  when: ReactNode;
  /** A word for what kind of event this is, when the title does not say. */
  chip?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  id?: string;
}) {
  return (
    <article
      data-cqx="card"
      id={id}
      className="mb-3 rounded-[3px] border border-rule bg-panel scroll-mt-[calc(var(--head)+62px)]"
    >
      <div className="flex items-start gap-2.5 px-3 pb-1.5 pt-3">
        <span className="mt-px shrink-0">{mark}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] leading-[1.35] text-ink">{title}</div>
          <div className="mt-px flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-faint">
            {when}
            {chip ? (
              <span className="rounded-[2px] border border-rule bg-ground px-[5px] py-px text-[10.5px] text-ink-soft">
                {chip}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {children ? <div className="px-3 pb-3 pt-1 text-[13px] leading-[1.5]">{children}</div> : null}
      {footer}
    </article>
  );
}

/** The circle a repository's own events carry. */
export function Face({ src, alt = '' }: { src: string; alt?: string }) {
  return (
    <span className="block box-border h-8 w-8 rounded-full bg-white p-0.5">
      <img className="block h-full w-full rounded-full object-cover" src={src} alt={alt} />
    </span>
  );
}

/** The circle an event with no face carries: a glyph, in a ring. */
export function Glyph({ children, tone = 'ink' }: { children: ReactNode; tone?: 'ink' | 'red' | 'green' | 'yellow' }) {
  const ring = {
    ink: 'border-rule text-ink-soft',
    red: 'border-red/45 text-red',
    green: 'border-green/45 text-green',
    yellow: 'border-yellow/50 text-yellow',
  }[tone];
  return (
    <span
      className={`grid h-8 w-8 place-items-center rounded-full border bg-ground font-mono text-[13px] ${ring}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}
