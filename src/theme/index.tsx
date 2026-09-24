'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyTheme, resolveTheme, themeScript, type Theme } from './shared.js';

export type { Theme } from './shared.js';
export { themeScript } from './shared.js';

const STORAGE_KEY = 'theme';
const THEME_COOKIE = 'theme';
const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

/** Legacy client export. Server-rendered applications should use theme/server. */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}

function readAppliedTheme(): Theme {
  const root = document.documentElement;
  const attribute = root.getAttribute('data-theme');
  if (attribute === 'light' || attribute === 'dark') return attribute;
  if (root.classList.contains('dark')) return 'dark';
  if (root.classList.contains('light')) return 'light';
  if (root.style.colorScheme === 'light' || root.style.colorScheme === 'dark') {
    return root.style.colorScheme;
  }
  return window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
}

function readSavedTheme(): Theme | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : null;
  } catch {
    return null;
  }
}

function writeSavedTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The cookie remains authoritative when storage is blocked.
  }
}

function readCookieTheme(): Theme | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)(?:;|$)/);
    return match ? match[1] as Theme : null;
  } catch {
    return null;
  }
}

function writeCookieTheme(theme: Theme): void {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function useTheme(): { theme: Theme | null; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme | null>(null);
  const hasSavedChoice = useRef(false);

  useEffect(() => {
    const cookie = readCookieTheme();
    const saved = readSavedTheme();
    hasSavedChoice.current = cookie !== null || saved !== null;
    const os = window.matchMedia(DARK_MODE_QUERY).matches ? 'dark' : 'light';
    const initial = resolveTheme(cookie, saved, os);
    if (cookie !== null && saved !== cookie) {
      writeSavedTheme(cookie);
    } else if (cookie === null && saved !== null) {
      writeCookieTheme(saved);
    }
    setTheme(initial);

    const media = window.matchMedia(DARK_MODE_QUERY);
    const followSystem = (event: MediaQueryListEvent) => {
      if (hasSavedChoice.current) return;
      const next = event.matches ? 'dark' : 'light';
      applyTheme(next);
      setTheme(next);
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = (theme ?? readAppliedTheme()) === 'dark' ? 'light' : 'dark';
    hasSavedChoice.current = true;
    applyTheme(next);
    setTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The selected theme still applies for this page when storage is blocked.
    }
    writeCookieTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}

/*
 * Lucide Sun and Moon elements copied from lucide-react v0.553.0.
 * ISC License
 * Copyright (c) 2026 Lucide Icons and Contributors
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */
function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {theme === 'dark'
        ? <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="m4.93 4.93 1.41 1.41" />
            <path d="m17.66 17.66 1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="m6.34 17.66-1.41 1.41" />
            <path d="m19.07 4.93-1.41 1.41" />
          </>
        : <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />}
    </svg>
  );
}

const toggleStyles = `
.kit-theme-toggle:hover {
  background: var(--kit-theme-hover, rgb(0 0 0 / .05));
}
:where([data-theme="dark"], .dark) .kit-theme-toggle:hover {
  background: var(--kit-theme-hover, rgb(255 255 255 / .1));
}
`;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const classes = ['kit-theme-toggle', className].filter(Boolean).join(' ');

  return (
    <>
      <style>{toggleStyles}</style>
      <button
        type="button"
        aria-label="Toggle theme"
        className={classes}
        onClick={toggleTheme}
        style={{
          alignItems: 'center',
          background: 'transparent',
          border: 0,
          borderRadius: '9999px',
          boxSizing: 'border-box',
          color: 'inherit',
          cursor: 'pointer',
          display: 'inline-flex',
          height: 32,
          justifyContent: 'center',
          padding: 8,
          width: 32,
        }}
      >
        {theme === null ? null : <ThemeIcon theme={theme} />}
      </button>
    </>
  );
}
