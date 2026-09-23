import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeScript, ThemeToggle, themeScript, useTheme } from '../dist/theme/index.js';

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

function runBootScript({ systemDark, saved, storageThrows = false }) {
  const dom = new JSDOM('<!doctype html><html class="dark"><head></head><body></body></html>', {
    runScripts: 'dangerously',
    url: 'https://theme.test/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: systemDark });
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

function installDom({ theme = 'light', saved = null, systemDark = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'https://theme.test/',
  });
  const { window } = dom;
  const media = mediaList(systemDark);
  window.matchMedia = () => media;
  if (saved !== null) window.localStorage.setItem('theme', saved);
  const rootElement = window.document.documentElement;
  rootElement.setAttribute('data-theme', theme);
  rootElement.classList.add(theme);
  rootElement.style.colorScheme = theme;
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return { dom, media, container: window.document.getElementById('root') };
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

  await act(async () => media.change(true));
  assert.equal(state.theme, 'light', 'system changes after a click are ignored');
  assert.equal(dom.window.document.documentElement.getAttribute('data-theme'), 'light');
  await act(async () => root.unmount());
  dom.window.close();
}

for (const [theme, path] of [
  ['light', 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6.5 6.5 0 0 0 8.268 8.268c.344-.215.825-.003.803.401'],
  ['dark', 'M12 2v2'],
]) {
  const { dom, container } = installDom({ theme });
  const root = createRoot(container);
  await act(async () => root.render(createElement(ThemeToggle, { className: 'host-class' })));
  const button = container.querySelector('button');
  assert.equal(button.getAttribute('aria-label'), 'Toggle theme');
  assert.equal(button.classList.contains('host-class'), true);
  assert.equal(button.querySelector('svg')?.getAttribute('width'), '16');
  assert.ok([...button.querySelectorAll('path')].some((node) => node.getAttribute('d') === path),
    `${theme} theme renders the corresponding Lucide path`);
  await act(async () => root.unmount());
  dom.window.close();
}

{
  const scriptElement = ThemeScript();
  assert.equal(scriptElement.props.dangerouslySetInnerHTML.__html, themeScript);
  const dom = new JSDOM(renderToStaticMarkup(createElement(ThemeToggle)));
  const button = dom.window.document.querySelector('button');
  assert.ok(button, 'server output contains the placeholder button');
  assert.equal(button.querySelector('svg'), null, 'server output has no theme icon');
  assert.equal(button.style.width, '32px');
  assert.equal(button.style.height, '32px');
  dom.window.close();
}

console.log('Theme boot script, hook, and toggle passed.');
