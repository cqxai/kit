'use client';

/**
 * What the page says while it does not know yet.
 *
 * The rule here is narrow and worth stating, because it was broken: **a page
 * that is still loading must not make claims.** Before this, the feed said
 * "Nothing to show yet — this repository has no history here" and the score
 * box said "Not scored at this commit", both of them during the two seconds
 * before the timeline and the dataset arrived. Both were false, and both were
 * the kind of false that makes a reader leave: they do not read it as "still
 * working", they read it as "there is nothing here".
 *
 * So the emptiness has to be *shaped* rather than described. A grey block the
 * size of the thing that is coming says "something goes here and it is not
 * here yet" without asserting anything at all, and it keeps the layout from
 * jumping when the real thing lands on top of it.
 *
 * The real empty states still exist — a repository genuinely can have no
 * history — but they are only allowed to speak once there is an answer.
 */
export function Bar({ w = '100%', h = 12 }: { w?: string; h?: number }) {
  return (
    <span
      className="block animate-pulse rounded-[2px] bg-ink/10 motion-reduce:animate-none"
      style={{ width: w, height: h }}
      aria-hidden="true"
    />
  );
}

/** A ring where a dial is coming. */
export function DialSkeleton() {
  return (
    <span className="flex w-[68px] flex-col items-center gap-1.5" aria-hidden="true">
      <span className="h-[58px] w-[58px] animate-pulse rounded-full border-[5px] border-ink/10 motion-reduce:animate-none" />
      <Bar w="70%" h={8} />
    </span>
  );
}

/** A card-shaped hole in the feed. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="mb-3 rounded-[3px] border border-rule bg-panel p-3" aria-hidden="true">
      <div className="flex items-start gap-2.5">
        <span className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-ink/10 motion-reduce:animate-none" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Bar w="62%" />
          <Bar w="38%" h={9} />
          {Array.from({ length: lines }, (_, i) => (
            <Bar key={i} w={i === lines - 1 ? '54%' : '92%'} h={9} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The feed, waiting.
 *
 * Deliberately says nothing about what is coming. Which cards a repository's
 * first screen holds depends on what it turns out to have, and a skeleton that
 * promises three findings to a repository with none has told a lie in the same
 * way words would have.
 */
export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading this repository's history">
      <CardSkeleton lines={3} />
      <CardSkeleton />
      <CardSkeleton lines={1} />
    </div>
  );
}

/** The date menu, waiting. */
export function RailSkeleton() {
  return (
    <div className="hidden space-y-2.5 pl-2.5 side:block" aria-hidden="true">
      <Bar w="52px" h={8} />
      {[68, 54, 62, 48, 58].map((w, i) => (
        <span key={i} className="block border-l-2 border-rule pl-[9px]">
          <Bar w={`${w}px`} h={9} />
        </span>
      ))}
    </div>
  );
}
