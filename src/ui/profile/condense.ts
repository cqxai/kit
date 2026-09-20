'use client';

import { useEffect, type RefObject } from 'react';

/**
 * The header handing itself over as the page scrolls.
 *
 * The full-size photograph is never touched: it scrolls off the top exactly
 * as it would on any page. By the time the tab row parks under the chrome the
 * whole cover is behind it, and a second, smaller identity slides into the
 * gutter the first one left. One element pretending to be two is something a
 * reader watches happen; two elements, one of which simply arrives, is
 * something they only notice afterwards.
 *
 * Two conditions have to hold before the small one comes in. Parked alone
 * brings it in while the big one is still crossing the gutter, which shows
 * the same face twice; cleared alone fires at rest on a narrow window, where
 * the avatar sits inside the cover to begin with.
 *
 * Nothing here is animated by script and nothing is positioned by it. What it
 * does is set two classes and one opacity, and CSS owns the rest.
 */
export function useCondense(
  face: RefObject<HTMLElement | null>,
  row: RefObject<HTMLElement | null>,
  chrome: RefObject<HTMLElement | null>,
  name: RefObject<HTMLElement | null>,
  firstTab: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    // A server-rendered cover cannot be handed a ref — it was created before
    // this component existed. The element is the same either way, and it
    // already carries the attribute the browser tests assert against.
    const found = () =>
      face.current ?? (document.querySelector('[data-cqx="face"]') as HTMLElement | null);

    const frame = () => {
      const f = found();
      const r = row.current;
      if (!f || !r) return;
      const fr = f.getBoundingClientRect();
      const rr = r.getBoundingClientRect();
      // Where the row comes to rest, asked of the row rather than measured
      // off the bar above it. The two are not the same number: the header is
      // as tall as its contents and the row parks at `--head`, which is what
      // the whole layout is spaced by. Reading the height instead meant the
      // row was already parked while this still believed it was travelling,
      // and the small identity never arrived at all.
      const rest = Number.parseFloat(getComputedStyle(r).top) || chrome.current?.offsetHeight || 0;
      const parked = rr.top <= rest + 1;
      r.dataset.parked = String(parked);
      r.dataset.compact = String(parked && fr.bottom <= rr.top + 6);
      // Once the row has parked, the whole cover is behind the chrome bar and
      // the avatar is the only part of it still on screen — so it is the only
      // part that has to get out of the way. It cannot go behind the row,
      // because at rest it overlaps the row and would be sliced in half. It
      // leaves on how far it has crossed instead: tied to the scroll rather
      // than to a clock, which is the difference between a thing that fades
      // and a thing a reader watches fading.
      f.style.opacity = parked
        ? String(Math.min(1, Math.max(0, (fr.bottom - rr.top) / rr.height)))
        : '1';
    };

    /**
     * The elevation ladder is centred on the row, so what the name has left is
     * whatever sits between the small avatar and the first rung — which
     * depends on the window, not on the name. Measured rather than guessed: a
     * fixed cap is right at one width and wrong at every other. Below what a
     * name needs to be worth reading, the avatar carries the bar alone.
     */
    const fit = () => {
      const n = name.current;
      const tab = firstTab.current;
      const r = row.current;
      if (!n || !tab || !r) return;
      n.style.display = '';
      n.style.maxWidth = 'none';
      const room = tab.getBoundingClientRect().left - n.getBoundingClientRect().left - 16;
      n.style.display = room < 44 ? 'none' : '';
      n.style.maxWidth = `${Math.max(0, Math.min(220, room))}px`;
    };

    const onResize = () => { fit(); frame(); };
    addEventListener('scroll', frame, { passive: true });
    addEventListener('resize', onResize);
    fit();
    frame();
    // Faces land after first paint and move the row a pixel or two.
    if (document.fonts?.ready) void document.fonts.ready.then(onResize);
    return () => {
      removeEventListener('scroll', frame);
      removeEventListener('resize', onResize);
    };
  }, [face, row, chrome, name, firstTab]);
}
