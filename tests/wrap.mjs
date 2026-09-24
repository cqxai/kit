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

const PHONE = 390;

// The path from facebook/react that made cqx.bio 634px wide (cqxai/kit#4).
const REACT_PATH =
  'copy of react_compiler_inference::propagate_scope_dependencies_hir::convert_hoisted_lvalue';
// Nothing to break at, so only `overflow-wrap` can save it.
const NO_SEAMS = `copy of ${'x'.repeat(120)}`;

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
    findings: [{ what, file: 'compiler/crates/react_compiler_inference/src/lib.rs', line: 0 }],
    level: 'L3',
    language: 'rust',
  };
}

const cases = [
  {
    name: 'RuleCard, a Rust path',
    expect: REACT_PATH,
    // Between the parts of the path, where a reader would break it.
    breaks: /(::| )$/,
    html: renderToStaticMarkup(h(RuleCard, { rule: ruleWith(REACT_PATH), repo: null, commit: null })),
    target: 'p.font-mono',
  },
  {
    name: 'RuleCard, a word with no separators',
    expect: NO_SEAMS,
    html: renderToStaticMarkup(h(RuleCard, { rule: ruleWith(NO_SEAMS), repo: null, commit: null })),
    target: 'p.font-mono',
  },
];

// The components name Tailwind utilities, and a host's Tailwind build is what
// turns them into CSS. There is no Tailwind here, so the few utilities that
// decide these widths are written out as Tailwind defines them. Arbitrary
// properties — `[overflow-wrap:anywhere]` — are generated from the markup the
// same way Tailwind does, so a class left off the element is a rule missing
// from the page.
function stylesFor(markup) {
  const arbitrary = new Set();
  for (const [, list] of markup.matchAll(/class="([^"]*)"/g)) {
    for (const name of list.split(/\s+/)) {
      const m = /^\[([a-z-]+):(.+)\]$/.exec(name);
      if (m) arbitrary.add(`.${CSS_escape(name)} { ${m[1]}: ${m[2].replaceAll('_', ' ')} }`);
    }
  }
  return `
    body { margin: 0; font-family: sans-serif; }
    .frame { width: ${PHONE}px; box-sizing: border-box; padding: 0 16px; overflow: auto; }
    .border { border: 1px solid #ccc } .border-l-\\[3px\\] { border-left-width: 3px }
    .font-mono { font-family: ui-monospace, monospace }
    .text-\\[11\\.5px\\] { font-size: 11.5px } .text-\\[13px\\] { font-size: 13px }
    .px-\\[15px\\] { padding-left: 15px; padding-right: 15px }
    .flex { display: flex } .flex-wrap { flex-wrap: wrap } .min-w-0 { min-width: 0 } .flex-1 { flex: 1 1 0% }
    .shrink-0 { flex-shrink: 0 } .hidden { display: none }
    .max-w-\\[74ch\\] { max-width: 74ch }
    ${[...arbitrary].join('\n')}
  `;
}

function CSS_escape(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

// Runs in the page. For each frame: how far its content reaches past it, and
// the text as it reads and as it copies.
const measure = `
  const out = [];
  for (const frame of document.querySelectorAll('.frame')) {
    const target = frame.querySelector(frame.dataset.target);
    const range = document.createRange();
    range.selectNodeContents(target);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    // The text as the reader sees it, one entry per line on screen.
    const lines = [''];
    let top = null;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode()); ) {
      for (let i = 0; i < node.length; i++) {
        const glyph = document.createRange();
        glyph.setStart(node, i);
        glyph.setEnd(node, i + 1);
        const y = glyph.getClientRects()[0]?.top;
        if (y !== undefined && top !== null && y > top + 1) lines.push('');
        if (y !== undefined) top = y;
        lines[lines.length - 1] += node.data[i];
      }
    }
    out.push({
      lines,
      overflow: frame.scrollWidth - frame.clientWidth,
      text: target.textContent,
      copied: selection.toString(),
    });
  }
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

const markup = cases
  .map((c, i) => `<div class="frame" data-case="${i}" data-target="${c.target}">${c.html}</div>`)
  .join('\n');
const page = `<!doctype html><meta charset="utf-8"><style>${stylesFor(markup)}</style>
<body>${markup}<pre id="result"></pre><script>${measure}</script></body>`;

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = join(root, '.tmp');
await mkdir(temporary, { recursive: true, mode: 0o700 });
const work = await mkdtemp(join(temporary, 'wrap-'));
try {
  const file = join(work, 'page.html');
  await writeFile(file, page);
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
  cases.forEach((c, i) => {
    const r = results[i];
    console.log(`${c.name}: ${r.overflow}px past a ${PHONE}px frame, lines ${JSON.stringify(r.lines)}`);
    assert.equal(r.overflow, 0, `${c.name}: runs ${r.overflow}px past a ${PHONE}px frame`);
    assert.equal(r.text, c.expect, `${c.name}: the text reads as written`);
    assert.equal(r.copied, c.expect, `${c.name}: the text copies as written`);
    if (c.breaks) {
      for (const line of r.lines.slice(0, -1)) {
        assert.match(line, c.breaks, `${c.name}: a line breaks at "${line}"`);
      }
    }
  });
  console.log(`Long names wrap inside a ${PHONE}px frame and copy as written (${chrome}).`);
} finally {
  await rm(work, { recursive: true, force: true });
}
