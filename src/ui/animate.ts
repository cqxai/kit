/**
 * Easing a number toward a target.
 *
 * A score arriving is the one moment this page has something to say, and a
 * number that simply appears says it in no time at all. PageSpeed sweeps its
 * rings for the same reason: the motion is what makes 31 read differently from
 * 100 before anybody has read either.
 *
 * Driven in JavaScript rather than by a CSS transition because the arc and the
 * figure inside it have to agree. Two independent transitions on the same
 * duration drift, and a ring that says 68 while its arc is three quarters round
 * is worse than no animation.
 */

import { useEffect, useRef, useState } from 'react';

const still = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fast at first, settling at the end — the shape a dial has when it lands. */
const ease = (t: number) => 1 - (1 - t) ** 3;

export function useEased(target: number, ms = 800): number {
  // Starts at the answer, not at nothing.
  //
  // It started at nothing, so that the first paint was a sweep. On a server
  // there is no window, `still()` is false, and the first paint was therefore
  // a dial reading **0** — baked into the HTML, which is what a crawler and
  // an assistant that does not run JavaScript would read as this
  // repository's CodeQuality Score. Nothing is a better answer than zero;
  // the true number is better than either.
  //
  // The sweep is not lost, it is moved to where it means something: a target
  // that *changes* still eases, which is every step through the time machine
  // and every commit clicked on the rail. What no longer animates is a value
  // that was already correct when the component mounted — and a number
  // animating up from zero to the figure it was already showing is a worse
  // thing than no animation at all.
  const [shown, setShown] = useState(target);
  // Where this run began, which is wherever the last one was interrupted —
  // clicking through commits should not restart the sweep from zero each time.
  const live = useRef(shown);

  useEffect(() => {
    if (still()) {
      live.current = target;
      setShown(target);
      return;
    }
    const from = live.current;
    if (from === target) return;
    const started = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / ms);
      const value = from + (target - from) * ease(t);
      live.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);

  return shown;
}
