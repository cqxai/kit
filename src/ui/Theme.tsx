'use client';

import { useEffect, useState } from 'react';

/**
 * The theme control, in the explorer's own stylesheet.
 *
 * cqx.dev has one of these already, written in Tailwind. This is not that
 * one, on purpose: the explorer is not a Tailwind surface — `globals.css`
 * carries `@source not "../explorer"` so that a class named `ring` for a
 * score dial does not collect a utility named `ring` — and a component
 * styled in one system rendered inside another is exactly the seam where
 * things come apart. Rendering the Tailwind one here drew its border in the
 * right place and its icons ninety-six pixels to the right of it.
 *
 * What is shared is the part that must be: the storage key. Both controls
 * read and write `cqx-theme`, so a choice made on the front page is the
 * choice the report opens with, and the boot script in the root layout
 * applies it before either of them mounts.
 */
type Choice = 'light' | 'system' | 'dark';

const KEY = 'cqx-theme';

const ICONS: Record<Choice, React.ReactNode> = {
  light: (
    <>
      <circle cx="8" cy="8" r="3.2" />
      <path d="M8 1v1.6M8 13.4V15M15 8h-1.6M2.6 8H1M12.9 3.1l-1.1 1.1M4.2 11.8l-1.1 1.1M12.9 12.9l-1.1-1.1M4.2 4.2L3.1 3.1" />
    </>
  ),
  system: (
    <>
      <rect x="1.6" y="2.6" width="12.8" height="9" rx="1.4" />
      <path d="M5.5 13.8h5" />
    </>
  ),
  dark: <path d="M13.4 9.6A5.8 5.8 0 0 1 6.4 2.6a5.9 5.9 0 1 0 7 7Z" />,
};

export function ThemePicker() {
  // "system" on the server, corrected on mount: what was stored is not
  // knowable until there is a document to ask.
  const [choice, setChoice] = useState<Choice>('system');

  useEffect(() => {
    try {
      const held = localStorage.getItem(KEY) as Choice | null;
      if (held === 'light' || held === 'dark' || held === 'system') setChoice(held);
    } catch {
      // Private windows and blocked storage: the system default is fine.
    }
  }, []);

  const pick = (next: Choice) => {
    setChoice(next);
    const root = document.documentElement;
    if (next === 'system') root.removeAttribute('data-theme');
    else root.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Held for this page, which is the best that can be done.
    }
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-rule p-0.5"
      role="group"
      aria-label="Colour theme"
    >
      {(['light', 'system', 'dark'] as Choice[]).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => pick(c)}
          aria-label={c === 'system' ? 'Follow the system theme' : `${c} theme`}
          aria-pressed={choice === c}
          className={
            'grid size-6 cursor-pointer place-items-center rounded border-0 bg-transparent p-0 transition-colors ' +
            (choice === c ? 'bg-rule-soft text-ink' : 'text-ink-faint hover:text-ink')
          }
        >
          <svg
            viewBox="0 0 16 16"
            width="13"
            height="13"
            fill={c === 'dark' ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="block"
          >
            {ICONS[c]}
          </svg>
        </button>
      ))}
    </div>
  );
}
