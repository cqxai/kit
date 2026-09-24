// Long names with no spaces in them must wrap inside their card on a phone,
// not push the page sideways, and must still read and copy as written.
//
// jsdom has no layout, so this asks a real browser: each component is
// rendered to HTML on the server, set in a frame as wide as a phone, and
// measured by headless Chrome. Nothing is fetched and no server runs.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RuleCard } from '../dist/ui/RuleCard.js';
import { Finding } from '../dist/ui/Finding.js';
import { Scope } from '../dist/ui/Report.js';
import { CommitCard } from '../dist/ui/cards/Commit.js';
import { ReleaseCard } from '../dist/ui/cards/Release.js';
import { Cover } from '../dist/ui/profile/Cover.js';
import { FilesLevel } from '../dist/ui/levels/Files.js';
import { FunctionsLevel } from '../dist/ui/levels/Functions.js';
import { ScoreLevel } from '../dist/ui/levels/Score.js';

const PHONE = 390;

// Real text that pushed cqx.bio past a phone's width (cqxai/kit#4).
const REACT_PATH =
  'copy of react_compiler_inference::propagate_scope_dependencies_hir::convert_hoisted_lvalue';
const HELIX_SUBJECT = 'typo: `request_document_diagnostics_for_language_se{,r}vers` (#16025)';
const REPO = 'cryptocorrosion/cryptocorrosion';
// GitHub allows a hundred characters for a repository's name.
const LONG_REPO = 'embedded-rust-community/embedded_hal_async_shared_bus_and_peripheral_drivers';
// Nothing to break at, so only `overflow-wrap` can save it.
const NO_SEAMS = `copy of ${'x'.repeat(120)}`;
const LONG_FILE = 'compiler/crates/react_compiler_inference/src/propagate_scope_dependencies_hir.rs';
const LONG_TYPE = 'std::collections::HashMap<react_compiler_hir::IdentifierId,react_compiler_hir::ReactiveScopeDependency>';
const LONG_CRATE = 'react_compiler_inference_propagate_scope_dependencies_hir_tests';

// Between the parts of a path, where a reader would break it.
const AT_SEAMS = /(::|[/.\- ])$/;

function ruleWith(what) {
  return {
    rule: 'duplicate-code',
    category: 'quality',
    describes: 'Blocks of code that appear more than once.',
    remedy: 'Pull the shared block into one function.',
    value: 3,
    weight: 4,
    deducted: 1.5,
    capped: false,
    total_findings: 1,
    // A finding about a whole file: no line, so no code is shown and the
    // finding's text is printed on its own.
    findings: [{ what, file: LONG_FILE, line: 0 }],
    level: 'L3',
    language: 'rust',
  };
}

const commit = {
  sha: 'a'.repeat(40),
  short: 'aaaaaaa',
  subject: HELIX_SUBJECT,
  author: 'someone',
  date: '2026-09-01T00:00:00Z',
  lines: 1000,
  scores: {},
  delta: {},
};

const fn = {
  id: 'fn:1',
  name: 'propagate_scope_dependencies_for_hoisted_lvalues_in_reactive_function',
  k: 'fn',
  pkg: 'react_compiler_inference',
  file: LONG_FILE,
  lines: 40,
  p: [['dependencies', LONG_TYPE, [[LONG_TYPE, 'react_compiler_hir', 0]]]],
  r: null,
  eff: [],
};

const noop = () => {};

// `checks` name the elements whose text must survive: as the reader sees it,
// and as it copies. `breaks`, where given, is what every wrapped line but the
// last must end with.
const cases = [
  {
    name: 'RuleCard, a Rust path',
    node: h(RuleCard, { rule: ruleWith(REACT_PATH), repo: null, commit: null }),
    checks: [{ selector: 'p[class~="font-mono"]', text: REACT_PATH, breaks: /(::| )$/ }],
  },
  {
    name: 'RuleCard, a word with no separators',
    node: h(RuleCard, { rule: ruleWith(NO_SEAMS), repo: null, commit: null }),
    checks: [{ selector: 'p[class~="font-mono"]', text: NO_SEAMS }],
  },
  {
    name: 'CommitCard, a subject with a long identifier',
    node: h(CommitCard, { commit, when: 'today', onOpen: null, scored: true }),
    checks: [{ selector: '[class~="leading-[1.35]"]', text: HELIX_SUBJECT }],
  },
  {
    name: 'ReleaseCard, a long repository and subject',
    node: h(ReleaseCard, {
      repo: LONG_REPO, avatar: 'data:,', tag: 'v1.0.0', at: 'aaaaaaa',
      commit: { ...commit, subject: `Move ${REACT_PATH.slice('copy of '.length)}` },
      when: 'today', onOpen: null,
    }),
    checks: [
      { selector: '[class~="leading-[1.35]"]', text: `${LONG_REPO} released v1.0.0` },
      { selector: '[data-cqx="card"] p', text: `Move ${REACT_PATH.slice('copy of '.length)}` },
    ],
  },
  {
    name: 'Cover, a long repository and description',
    node: h(Cover, {
      repo: REPO,
      meta: { description: `Pure Rust implementations of ${NO_SEAMS}` },
      crates: 0, files: 0, lines: 0, packages: [], faceRef: { current: null },
    }),
    checks: [
      { selector: 'h1', text: REPO, breaks: AT_SEAMS },
      { selector: '[data-cqx="cover"] p', text: `Pure Rust implementations of ${NO_SEAMS}` },
    ],
  },
  {
    name: 'ScoreLevel, the subject of the commit being viewed',
    node: h(ScoreLevel, {
      score: { lines: 1000, scores: {}, rules: [], config: { version: 1, config_path: null, min_score: null, exclude: [], rules: {} } },
      commits: [commit], viewing: 0, at: null, repo: null, onBackToHead: noop, onJump: noop,
    }),
    checks: [{ selector: '[class~="[&>b]:text-accent"] > span', text: `· ${HELIX_SUBJECT}` }],
  },
  {
    name: 'Finding, a long path and what it found',
    node: h(Finding, { finding: { what: REACT_PATH, file: LONG_FILE, line: 0 } }),
    checks: [
      { selector: '[class~="text-ink-soft"]', text: LONG_FILE, breaks: AT_SEAMS },
      { selector: '[class~="text-ink-faint"]', text: REACT_PATH, breaks: AT_SEAMS },
    ],
  },
  {
    name: 'FunctionsLevel, a long name, file and type',
    node: h(FunctionsLevel, { functions: [fn], focus: null, notable: 1, total: 1 }),
    checks: [
      { selector: '[class~="text-[13.5px]"]', text: fn.name },
      { selector: '[class~="ml-auto"]', text: LONG_FILE, breaks: AT_SEAMS },
      // No `breaks`: on a phone the label and crate columns keep their width and
      // leave the type about thirteen characters, narrower than its parts.
      { selector: '[class~="contents"] > [class~="text-ink"]', text: LONG_TYPE },
    ],
  },
  {
    name: 'Report scope, a deep file',
    node: h(Scope, {
      view: { repo: REPO, ref: null, level: 'L4', pkg: LONG_CRATE, file: LONG_FILE, focus: null },
      onGo: noop,
    }),
    checks: [
      { selector: 'nav button', text: REPO, breaks: AT_SEAMS },
      { selector: 'nav span:nth-child(2) button', text: LONG_CRATE },
      { selector: 'nav [aria-current="page"]', text: LONG_FILE, breaks: AT_SEAMS },
    ],
  },
  {
    name: 'FilesLevel, a long crate name in the lede',
    node: h(FilesLevel, { files: [], scopeName: LONG_CRATE, onSelect: noop }),
    checks: [{ selector: 'p', text: `In ${LONG_CRATE}. Ordered by size. Selecting one scopes Types and Functions.` }],
  },
];

// The components name Tailwind utilities, and a host's Tailwind build is what
// turns them into CSS. There is no Tailwind here, so the utilities that decide
// widths are generated from the markup the way Tailwind generates them: the
// spacing scale, arbitrary values, arbitrary properties such as
// `[overflow-wrap:anywhere]`, and a few keywords. A class left off an element
// is a rule missing from the page. `max-side:` is the phone breakpoint, so it
// applies; `side:` and `wide:` are wider screens, so they do not.
const KEYWORDS = {
  block: 'display: block', hidden: 'display: none', contents: 'display: contents',
  flex: 'display: flex', 'inline-flex': 'display: inline-flex', grid: 'display: grid',
  'flex-wrap': 'flex-wrap: wrap', 'flex-1': 'flex: 1 1 0%', 'shrink-0': 'flex-shrink: 0',
  'min-w-0': 'min-width: 0', 'ml-auto': 'margin-left: auto',
  relative: 'position: relative', absolute: 'position: absolute', 'inset-0': 'inset: 0',
  'w-full': 'width: 100%', 'h-full': 'height: 100%',
  'font-mono': 'font-family: ui-monospace, monospace', 'font-semibold': 'font-weight: 600',
  'font-bold': 'font-weight: 700', 'whitespace-pre-wrap': 'white-space: pre-wrap',
  'whitespace-nowrap': 'white-space: nowrap', 'whitespace-pre': 'white-space: pre',
  'overflow-hidden': 'overflow: hidden', 'overflow-x-auto': 'overflow-x: auto',
  border: 'border: 1px solid #ccc',
};
const BOX = {
  p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'],
  pl: ['padding-left'], pr: ['padding-right'], pt: ['padding-top'], pb: ['padding-bottom'],
  m: ['margin'], mx: ['margin-left', 'margin-right'], my: ['margin-top', 'margin-bottom'],
  ml: ['margin-left'], mr: ['margin-right'], mt: ['margin-top'], mb: ['margin-bottom'],
  gap: ['gap'], 'gap-x': ['column-gap'], 'gap-y': ['row-gap'],
  left: ['left'], right: ['right'], top: ['top'], bottom: ['bottom'],
  w: ['width'], h: ['height'], 'max-w': ['max-width'], 'border-l': ['border-left-width'],
};

function declarationsFor(utility) {
  if (KEYWORDS[utility]) return KEYWORDS[utility];
  let m = /^\[([a-z-]+):(.+)\]$/.exec(utility);
  if (m) return `${m[1]}: ${m[2].replaceAll('_', ' ')}`;
  m = /^text-\[(\d+(?:\.\d+)?px)\]$/.exec(utility);
  if (m) return `font-size: ${m[1]}`;
  m = /^grid-cols-\[(.+)\]$/.exec(utility);
  if (m) return `grid-template-columns: ${m[1].replaceAll('_', ' ')}`;
  m = /^([a-z]+(?:-[a-z])?)-(\d+(?:\.\d+)?|\[[^\]]+\])$/.exec(utility);
  if (m && BOX[m[1]]) {
    const value = m[2].startsWith('[') ? m[2].slice(1, -1).replaceAll('_', ' ') : `${Number(m[2]) * 0.25}rem`;
    return BOX[m[1]].map((property) => `${property}: ${value}`).join('; ');
  }
  return null;
}

function stylesFor(markup) {
  const base = [];
  const phone = [];
  for (const [, list] of markup.matchAll(/class="([^"]*)"/g)) {
    for (const name of list.split(/\s+/).filter(Boolean)) {
      const [variant, utility] = name.startsWith('max-side:') ? ['phone', name.slice(9)] : [null, name];
      if (utility.includes(':') && !utility.startsWith('[')) continue;
      const declarations = declarationsFor(utility);
      if (declarations) (variant ? phone : base).push(`.${cssEscape(name)} { ${declarations} }`);
    }
  }
  return `
    body { margin: 0; font-family: sans-serif; }
    .frame { width: ${PHONE}px; box-sizing: border-box; padding: 0 16px 24px; overflow: auto; }
    ${[...new Set(base)].join('\n')}
    ${[...new Set(phone)].join('\n')}
  `;
}

function cssEscape(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

// Runs in the page. For each frame: how far its content reaches past it, and
// for each check, the text as it reads, as it copies, and line by line as it
// is laid out.
const measure = `
  const out = [];
  document.querySelectorAll('.frame').forEach((frame, i) => {
    const checks = CHECKS[i].map((selector) => {
      const target = frame.querySelector(selector);
      if (!target) return null;
      const range = document.createRange();
      range.selectNodeContents(target);
      const selection = getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      const lines = [''];
      let top = null;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      for (let node; (node = walker.nextNode()); ) {
        for (let c = 0; c < node.length; c++) {
          const glyph = document.createRange();
          glyph.setStart(node, c);
          glyph.setEnd(node, c + 1);
          const y = glyph.getClientRects()[0]?.top;
          if (y !== undefined && top !== null && y > top + 1) lines.push('');
          if (y !== undefined) top = y;
          lines[lines.length - 1] += node.data[c];
        }
      }
      return { text: target.textContent, copied: selection.toString(), lines };
    });
    out.push({ overflow: frame.scrollWidth - frame.clientWidth, checks });
  });
  // Percent-encoded, so nothing in it needs unescaping from HTML.
  document.getElementById('result').textContent = encodeURIComponent(JSON.stringify(out));
`;

function findChrome() {
  const candidates = [
    process.env.CHROME,
    '/opt/pw-browsers/chromium',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {}
  }
  throw new Error(`no Chrome or Chromium found; set CHROME to one. Tried: ${candidates.join(', ')}`);
}

const markup = cases.map((c) => `<div class="frame">${renderToStaticMarkup(c.node)}</div>`).join('\n');
const selectors = cases.map((c) => c.checks.map((check) => check.selector));
const page = `<!doctype html><meta charset="utf-8"><style>${stylesFor(markup)}</style>
<body>${markup}<pre id="result"></pre>
<script>const CHECKS = ${JSON.stringify(selectors)};${measure}</script></body>`;

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = join(root, '.tmp');
await mkdir(temporary, { recursive: true, mode: 0o700 });
const work = await mkdtemp(join(temporary, 'wrap-'));
try {
  const file = join(work, 'page.html');
  await writeFile(file, page);
  if (process.env.WRAP_PAGE) await writeFile(process.env.WRAP_PAGE, page);
  const chrome = findChrome();
  const dom = execFileSync(
    chrome,
    ['--headless', '--no-sandbox', '--disable-gpu', `--user-data-dir=${join(work, 'profile')}`, '--dump-dom', pathToFileURL(file).href],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 60_000 },
  );
  const json = /<pre id="result">([^<]*)<\/pre>/.exec(dom)?.[1];
  assert.ok(json, 'the page reported its measurements');
  const results = JSON.parse(decodeURIComponent(json));
  assert.equal(results.length, cases.length);

  // Every case is reported before any is judged, so one failure does not hide
  // the state of the rest.
  const failures = [];
  cases.forEach((c, i) => {
    const r = results[i];
    console.log(`${c.name}: ${r.overflow}px past a ${PHONE}px frame`);
    if (r.overflow !== 0) failures.push(`${c.name}: runs ${r.overflow}px past a ${PHONE}px frame`);
    c.checks.forEach((check, j) => {
      const got = r.checks[j];
      if (!got) return failures.push(`${c.name}: nothing matches ${check.selector}`);
      console.log(`  ${check.selector}: ${JSON.stringify(got.lines)}`);
      if (got.text !== check.text) failures.push(`${c.name}: reads ${JSON.stringify(got.text)}`);
      if (got.copied !== check.text) failures.push(`${c.name}: copies as ${JSON.stringify(got.copied)}`);
      if (check.breaks) {
        for (const line of got.lines.slice(0, -1)) {
          if (!check.breaks.test(line)) failures.push(`${c.name}: breaks mid-name after ${JSON.stringify(line)}`);
        }
      }
    });
  });
  assert.deepEqual(failures, [], `\n${failures.join('\n')}`);
  console.log(`Long names wrap inside a ${PHONE}px frame and copy as written (${chrome}).`);
} finally {
  await rm(work, { recursive: true, force: true });
}
