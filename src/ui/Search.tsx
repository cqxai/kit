import { useEffect, useMemo, useRef, useState } from 'react';

import type { Dataset } from '../engine/index.js';
import type { View } from '../engine/index.js';
import { buildIndex, search, KIND_LABEL, KIND_ORDER, type Hit } from '../engine/index.js';

/**
 * The way across.
 *
 * The elevations descend — a crate, its files, their types — and that is the
 * right shape for reading a codebase you have never seen. It is the wrong
 * shape for the second visit, when you know the name of the thing and want to
 * be standing on it. Every list is capped, every cap is generous, and none of
 * them will ever contain the one symbol somebody came here for.
 *
 * Deliberately not a filter on the current elevation. A filter can only find
 * what is already in scope, and the reason to search is usually that it isn't.
 */

const SHOWN = 24;

/** A result. Four columns where there is room, three on a phone. */
const ROW = [
  'grid w-full cursor-pointer items-baseline gap-2.5 rounded-md border-0 bg-transparent',
  'px-[9px] py-1.5 text-left text-ink',
  'grid-cols-[62px_minmax(0,1fr)_auto] min-[620px]:grid-cols-[62px_minmax(0,auto)_minmax(0,1fr)_auto]',
  'aria-selected:bg-rule-soft',
].join(' ');

/** A line of explanation inside the palette, in its quietest voice. */
const NOTE = 'mx-[9px] mb-[7px] mt-1.5 py-2.5 font-mono text-[12.5px] leading-normal text-ink-faint [&_b]:text-ink';

/** Coarse to fine, and only where a colour carries meaning. */
const TONE: Record<string, string> = {
  crate: 'border-button text-accent',
  file: 'border-rule-soft text-ink-faint',
  type: 'border-green text-green',
  function: 'border-rule text-ink-soft',
};

/** What kind of thing a row is, in a column of its own so the names below
 *  each other line up — the names are what is being read down. */
function Chip({ kind }: { kind: Hit['kind'] }) {
  return (
    <span
      data-cqx="hit-kind"
      className={
        'self-center rounded border py-px text-center font-mono text-[9.5px] uppercase tracking-[0.06em] ' +
        (TONE[kind] ?? 'border-rule-soft text-ink-faint')
      }
    >
      {kind}
    </span>
  );
}

export function Search({
  data,
  open,
  onClose,
  onGo,
}: {
  data: Dataset | null;
  open: boolean;
  onClose: () => void;
  onGo: (patch: Partial<View>) => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const box = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  // Rebuilt when the commit changes, which is the only time it can be wrong.
  // Forty thousand entries take a few milliseconds to lay out and are then
  // scanned in under one, so there is nothing here worth doing incrementally.
  const index = useMemo(() => (data ? buildIndex(data) : null), [data]);
  const hits = useMemo(
    () => (index ? search(index, query, SHOWN) : []),
    [index, query],
  );

  // A new query is a new list, and the old cursor position means nothing in it.
  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    // After the sheet exists. Focusing during the render that creates it is a
    // no-op, and an unfocused search box is a box that swallows the next key.
    const id = requestAnimationFrame(() => box.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Keep the cursor on screen. A palette is twenty-four rows in a box that
  // shows eight, and arrowing past the fold with nothing moving looks broken.
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, hits]);

  if (!open) return null;

  const choose = (hit: Hit) => {
    onClose();
    onGo(hit.go);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      setActive((i) => (hits.length ? (i + 1) % hits.length : 0));
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      setActive((i) => (hits.length ? (i - 1 + hits.length) % hits.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[active];
      if (hit) choose(hit);
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex justify-center bg-ink/25 px-4 pb-4 pt-[min(14vh,110px)] backdrop-blur-[2px] animate-fade motion-reduce:animate-none"
      onMouseDown={(e) => {
        // Only the backdrop. A drag that starts on a row and ends out here is
        // a selection, not a dismissal.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-full w-[min(680px,100%)] flex-col self-start overflow-hidden rounded-[10px] border border-rule bg-ground shadow-[0_18px_50px_rgb(0_0_0/0.22)] animate-open motion-reduce:animate-none"
        role="dialog" aria-modal="true" aria-label="Search this repository">
        <div className="flex items-center gap-2.5 border-b border-rule px-3.5 py-3">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.6" />
            <path d="M10.4 10.4 14 14" />
          </svg>
          <input
            ref={box}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder={index ? 'crate, file, type, function…' : 'nothing loaded yet'}
            aria-label="Search this repository"
            role="combobox"
            aria-expanded="true"
            aria-controls="cqx-hits"
            aria-activedescendant={hits[active] ? `hit-${active}` : undefined}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-auto border-0 bg-transparent p-0 font-mono text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <button
            className="cursor-pointer rounded border border-rule bg-transparent px-1.5 py-px font-mono text-[10.5px] text-ink-faint hover:border-button hover:text-ink"
            onClick={onClose}
            aria-label="Close"
          >
            esc
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-[5px]" id="cqx-hits" role="listbox" ref={list}>
          {!index ? (
            <p className={NOTE}>Nothing is loaded yet.</p>
          ) : hits.length === 0 ? (
            <p className={NOTE}>
              Nothing matches <b>{query}</b>.
              {/* The dataset holds the declarations a repository owns and the
                  functions that do something notable, not every symbol that
                  was parsed. A reader who searched for a real name and found
                  nothing deserves to know which of those two happened. */}
              {index.totals.function > index.counts.function ? (
                <span>
                  {' '}Functions are searchable where they carry an effect, return an
                  unstructured error, or take three or more parameters —{' '}
                  {index.counts.function.toLocaleString()} of{' '}
                  {index.totals.function.toLocaleString()}.
                </span>
              ) : null}
            </p>
          ) : (
            <>
              {query ? null : (
                <p className="mx-[9px] mb-[7px] mt-1.5 font-mono text-[11px] leading-normal text-ink-faint">
                  Largest crates, most-used types
                </p>
              )}
              {hits.map((hit, i) => (
                <button
                  key={hit.key}
                  id={`hit-${i}`}
                  role="option"
                  aria-selected={i === active}
                  className={ROW}
                  // Pointer, not hover: moving the mouse across the list while
                  // arrowing through it should not fight the keyboard.
                  onMouseMove={() => setActive(i)}
                  onClick={() => choose(hit)}
                >
                  <Chip kind={hit.kind} />
                  <span data-cqx="hit-name" className="truncate font-mono text-[13px] font-semibold">
                    {hit.name}
                  </span>
                  {/* The end of a path is the interesting end, so it is the end
                      that survives: direction flips the overflow to the left,
                      and the isolation keeps the flip from reordering the
                      punctuation with it. Hidden where there is no room. */}
                  <span className="hidden truncate text-left font-mono text-[11px] text-ink-faint [direction:rtl] [unicode-bidi:isolate] min-[620px]:block">
                    {hit.where}
                  </span>
                  <span className="whitespace-nowrap font-mono text-[11px] text-ink-soft">
                    {hit.note}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-4 border-t border-rule bg-panel px-3.5 py-2 font-mono text-[10.5px] text-ink-faint [&_kbd]:mr-0.5 [&_kbd]:rounded-[3px] [&_kbd]:border [&_kbd]:border-rule [&_kbd]:px-[3px] [&_kbd]:font-[inherit] [&_kbd]:text-ink-soft">
          <span><kbd>↑</kbd><kbd>↓</kbd> move · <kbd>↵</kbd> open · <kbd>esc</kbd> close</span>
          {index ? (
            <span data-cqx="counts" className="flex flex-wrap gap-3">
              {KIND_ORDER.map((k) => (
                <span key={k}>
                  {index.counts[k].toLocaleString()}
                  {index.totals[k] > index.counts[k] ? ` of ${index.totals[k].toLocaleString()}` : ''}
                  {' '}
                  {KIND_LABEL[k]}
                </span>
              ))}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * The shortcut, and the button that says what it is.
 *
 * Slash as well as the modifier: it costs nothing, it is what every code host
 * uses, and someone who has never met a command palette is far likelier to
 * try it. Neither fires while something is already being typed into.
 */
export function useSearchKey(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el?.isContentEditable === true;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey)) {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpen]);
}

/** Mac says ⌘K and everywhere else says Ctrl K, and guessing wrong is worse
 *  than not saying. The platform is only knowable once there is a window. */
export function SearchButton({ onOpen }: { onOpen: () => void }) {
  const [mac, setMac] = useState<boolean | null>(null);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)), []);
  return (
    <button
      className="inline-flex cursor-pointer items-center gap-[7px] rounded-md border border-rule bg-panel py-1 pl-[9px] pr-2 text-[12.5px] text-ink-soft hover:border-button hover:text-ink"
      onClick={onOpen}
      aria-label="Search this repository"
    >
      <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="7" cy="7" r="4.6" />
        <path d="M10.4 10.4 14 14" />
      </svg>
      <span className="hidden side:inline">Search</span>
      {/* Reserved: the shortcut is not knowable until there is a window to
          ask, and a button that grows a key a frame later shifts the header. */}
      <kbd className="hidden min-w-[4ch] rounded border border-rule px-1 text-center font-mono text-[10.5px] text-ink-faint side:inline-block">
        {mac === null ? '' : mac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}
