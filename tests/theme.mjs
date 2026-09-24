import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeScript, ThemeToggle, themeScript, useTheme } from '../dist/theme/index.js';
import { ThemeScript as ServerThemeScript, themeFromCookie } from '../dist/theme/server.js';

async function readLucideIconNode(name) {
  const source = await readFile(new URL(`./fixtures/lucide-0.553.0/${name}.js`, import.meta.url), 'utf8');
  const match = source.match(/const __iconNode = (\[[\s\S]*?\]);\nconst [A-Z]/);
  assert.ok(match, `lucide-react 0.553.0 ${name} fixture contains __iconNode`);
  return JSON.parse(JSON.stringify(runInNewContext(match[1])));
}

function renderedIconElements(svg) {
  return [...svg.children].map((element) => {
    const attributes = {};
    for (const attribute of element.attributes) attributes[attribute.name] = attribute.value;
    return [element.localName, attributes];
  });
}

function mediaList(initial) {
  const listeners = new Set();
  return {
    matches: initial,
    addEventListener(type, listener) {
      if (type === 'change') listeners.add(listener);
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener);
    },
    change(matches) {
      this.matches = matches;
      for (const listener of listeners) listener({ matches });
    },
  };
}

function runBootScript({ systemDark, saved, cookie, storageThrows = false }) {
  const dom = new JSDOM('<!doctype html><html class="dark"><head></head><body></body></html>', {
    runScripts: 'dangerously',
    url: 'https://theme.test/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: systemDark });
  if (cookie !== undefined) window.document.cookie = `theme=${cookie}; Path=/`;
  if (storageThrows) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage blocked'); },
    });
  } else if (saved !== undefined) {
    window.localStorage.setItem('theme', saved);
  }
  const script = window.document.createElement('script');
  script.textContent = themeScript;
  window.document.head.append(script);
  const root = window.document.documentElement;
  return {
    theme: root.getAttribute('data-theme'),
    classDark: root.classList.contains('dark'),
    classLight: root.classList.contains('light'),
    colorScheme: root.style.colorScheme,
    dom,
  };
}

for (const [name, options, expected] of [
  ['no saved theme follows dark OS', { systemDark: true }, 'dark'],
  ['no saved theme follows light OS', { systemDark: false }, 'light'],
  ['saved light overrides dark OS', { systemDark: true, saved: 'light' }, 'light'],
  ['theme cookie overrides dark OS and stale local storage', { systemDark: true, saved: 'dark', cookie: 'light' }, 'light'],
  ['theme cookie overrides light OS and stale local storage', { systemDark: false, saved: 'light', cookie: 'dark' }, 'dark'],
  ['garbage saved theme falls back to OS', { systemDark: true, saved: 'sepia' }, 'dark'],
  ['blocked localStorage falls back to OS', { systemDark: true, storageThrows: true }, 'dark'],
]) {
  const result = runBootScript(options);
  assert.equal(result.theme, expected, name);
  assert.equal(result.classDark, expected === 'dark', `${name}: dark class`);
  assert.equal(result.classLight, expected === 'light', `${name}: light class`);
  assert.equal(result.colorScheme, expected, `${name}: color-scheme`);
  result.dom.window.close();
}

assert.equal(themeFromCookie('light'), 'light');
assert.equal(themeFromCookie('dark'), 'dark');
assert.equal(themeFromCookie('system'), null);
assert.equal(themeFromCookie(undefined), null);

function installDom({ theme = 'light', saved = null, cookie = null, systemDark = false, protocol = 'https:' } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: `${protocol}//theme.test/`,
  });
  const { window } = dom;
  const media = mediaList(systemDark);
  window.matchMedia = () => media;
  if (saved !== null) window.localStorage.setItem('theme', saved);
  if (cookie !== null) window.document.cookie = `theme=${cookie}; Path=/`;
  const rootElement = window.document.documentElement;
  rootElement.setAttribute('data-theme', theme);
  rootElement.classList.add(theme);
  rootElement.style.colorScheme = theme;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return { dom, media, container: window.document.getElementById('root') };
}

{
  const { dom, media, container } = installDom({ theme: 'dark', cookie: 'dark' });
  const root = createRoot(container);
  let state;
  await act(async () => root.render(createElement(Probe, { onValue: (value) => { state = value; } })));
  assert.equal(state.theme, 'dark');
  await act(async () => media.change(false));
  assert.equal(state.theme, 'dark', 'a cookie choice is not replaced by a system change');
  await act(async () => root.unmount());
  dom.window.close();
}

function Probe({ onValue }) {
  const state = useTheme();
  onValue(state);
  return createElement('output', { 'data-theme': state.theme ?? '' }, state.theme ?? 'pending');
}

{
  const { dom, media, container } = installDom();
  const root = createRoot(container);
  let state;
  await act(async () => root.render(createElement(Probe, { onValue: (value) => { state = value; } })));
  assert.equal(state.theme, 'light', 'hook reads the script-applied value after mount');
  assert.equal(dom.window.document.cookie, '', 'no saved choice does not create a theme cookie');

  await act(async () => media.change(true));
  assert.equal(state.theme, 'dark', 'system change before a click is followed');
  assert.equal(dom.window.document.documentElement.getAttribute('data-theme'), 'dark');

  await act(async () => state.toggleTheme());
  assert.equal(state.theme, 'light', 'toggle flips dark to light');
  assert.equal(dom.window.document.documentElement.getAttribute('data-theme'), 'light');
  assert.equal(dom.window.document.documentElement.classList.contains('light'), true);
  assert.equal(dom.window.document.documentElement.classList.contains('dark'), false);
  assert.equal(dom.window.document.documentElement.style.colorScheme, 'light');
  assert.equal(dom.window.localStorage.getItem('theme'), 'light');
  assert.equal(dom.window.document.cookie, 'theme=light');

  await act(async () => media.change(true));
  assert.equal(state.theme, 'light', 'system changes after a click are ignored');
  assert.equal(dom.window.document.documentElement.getAttribute('data-theme'), 'light');
  await act(async () => root.unmount());
  dom.window.close();
}

for (const [protocol, secure] of [['https:', true], ['http:', false]]) {
  const { dom, container } = installDom({ theme: 'light', saved: 'light', protocol });
  const root = createRoot(container);
  let state;
  await act(async () => root.render(createElement(Probe, { onValue: (value) => { state = value; } })));
  assert.equal(state.theme, 'light');
  assert.equal(dom.window.document.cookie, 'theme=light', `${protocol} restores a legacy saved choice to the cookie`);
  const themeCookie = dom.cookieJar.getCookiesSync(`${protocol}//theme.test/`).find(({ key }) => key === 'theme');
  assert.equal(themeCookie?.secure, secure, `${protocol} sets Secure=${secure}`);
  await act(async () => root.unmount());
  dom.window.close();
}

{
  const { dom, container } = installDom({ theme: 'dark', saved: 'light', cookie: 'dark' });
  const root = createRoot(container);
  let state;
  await act(async () => root.render(createElement(Probe, { onValue: (value) => { state = value; } })));
  assert.equal(state.theme, 'light', 'a saved choice replaces a different cookie');
  assert.equal(dom.window.document.cookie, 'theme=light');
  assert.equal(dom.window.document.documentElement.getAttribute('data-theme'), 'light');
  await act(async () => root.unmount());
  dom.window.close();
}

for (const [theme, iconName] of [
  ['light', 'moon'],
  ['dark', 'sun'],
]) {
  const { dom, container } = installDom({ theme });
  const root = createRoot(container);
  await act(async () => root.render(createElement(ThemeToggle, { className: 'host-class' })));
  const button = container.querySelector('button');
  assert.equal(button.getAttribute('aria-label'), 'Toggle theme');
  assert.equal(button.classList.contains('host-class'), true);
  assert.equal(button.querySelector('svg')?.getAttribute('width'), '16');
  const expected = (await readLucideIconNode(iconName)).map(([tagName, attributes]) => [
    tagName,
    Object.fromEntries(Object.entries(attributes).filter(([name]) => name !== 'key')),
  ]);
  assert.deepEqual(renderedIconElements(button.querySelector('svg')), expected,
    `${theme} theme renders the exact lucide-react 0.553.0 ${iconName} elements`);
  await act(async () => root.unmount());
  dom.window.close();
}

{
  const scriptElement = ThemeScript();
  assert.equal(scriptElement.props.dangerouslySetInnerHTML.__html, themeScript);
  assert.equal(ServerThemeScript().props.dangerouslySetInnerHTML.__html, themeScript);
  const dom = new JSDOM(renderToStaticMarkup(createElement(ThemeToggle)));
  const button = dom.window.document.querySelector('button');
  assert.ok(button, 'server output contains the placeholder button');
  assert.equal(button.querySelector('svg'), null, 'server output has no theme icon');
  assert.equal(button.style.width, '32px');
  assert.equal(button.style.height, '32px');
  dom.window.close();
}

console.log('Theme boot script, hook, and toggle passed.');
