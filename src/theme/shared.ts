export type Theme = 'light' | 'dark'

export function resolveTheme(cookie: Theme | null, saved: Theme | null, os: Theme): Theme {
  return cookie ?? saved ?? os
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove(theme === 'dark' ? 'light' : 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export const themeScript = `(function () {
  var cookie = null;
  var saved = null;
  try {
    var match = document.cookie.match(/(?:^|;\\s*)theme=(light|dark)(?:;|$)/);
    cookie = match ? match[1] : null;
  } catch (_) {}
  try {
    var stored = localStorage.getItem('theme');
    saved = stored === 'light' || stored === 'dark' ? stored : null;
  } catch (_) {}
  var resolveTheme = ${resolveTheme.toString()};
  var os = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  var t = resolveTheme(cookie, saved, os);
  var applyTheme = ${applyTheme.toString()};
  applyTheme(t);
})();`
