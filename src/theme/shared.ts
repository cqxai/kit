export type Theme = 'light' | 'dark'

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.remove(theme === 'dark' ? 'light' : 'dark')
  root.classList.add(theme)
  root.style.colorScheme = theme
}

export const themeScript = `(function () {
  var t;
  try {
    var match = document.cookie.match(/(?:^|;\\s*)theme=(light|dark)(?:;|$)/);
    t = match ? match[1] : localStorage.getItem('theme');
  } catch (_) {}
  if (t !== 'light' && t !== 'dark') {
    t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var applyTheme = ${applyTheme.toString()};
  applyTheme(t);
})();`
