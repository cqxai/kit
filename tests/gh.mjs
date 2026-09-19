/**
 * The proxy that keeps a reader off GitHub's rate limit.
 *
 * The thing worth testing is not that it fetches — it is that it mostly does
 * not. Every answer here is shared by every visitor, so what matters is which
 * answers are kept, for how long, and what happens when GitHub says no.
 */
import { answer } from '../dist/gh/index.js';

let failed = 0;
const check = (what, cond, detail = '') => {
  if (cond) console.log('  ok  ' + what);
  else { failed++; console.error('FAIL: ' + what + (detail ? ' — ' + detail : '')); }
};

/** A bucket, in a Map. */
function bucket() {
  const held = new Map();
  return {
    held,
    async get(key) {
      const v = held.get(key);
      return v === undefined ? null : { json: async () => JSON.parse(v) };
    },
    async put(key, value) { held.set(key, value); },
  };
}

/** Counts what GitHub was actually asked for. */
function github(routes) {
  const asked = [];
  globalThis.fetch = async (url, init) => {
    asked.push({ url: String(url), auth: init?.headers?.authorization ?? null });
    for (const [match, body] of Object.entries(routes)) {
      if (String(url).includes(match)) {
        if (body === 'fail') return new Response('no', { status: 403 });
        return new Response(JSON.stringify(body), { status: 200 });
      }
    }
    return new Response('[]', { status: 200 });
  };
  return asked;
}

const commits = [
  { sha: 'a'.repeat(40), commit: { message: 'first\nbody', author: { name: 'Sami', date: '2026-01-01' } } },
];

// 1. The second reader costs nothing.
{
  const store = bucket();
  const asked = github({ '/commits': commits });
  const one = await answer(new Request('https://x/gh/o/r/commits'), { store });
  const got = await one.json();
  check('a commit list comes back trimmed to what a rail shows',
    got[0].short === 'a'.repeat(8) && got[0].subject === 'first' && !('commit' in got[0]),
    JSON.stringify(got[0]));
  await answer(new Request('https://x/gh/o/r/commits'), { store });
  check('and the second reader does not reach GitHub', asked.length === 1, `${asked.length} requests`);
}

// 2. A tree is trimmed hard and kept for good.
{
  const store = bucket();
  const asked = github({
    '/git/trees/': {
      sha: 'c'.repeat(40),
      truncated: false,
      tree: [
        { path: 'src/main.rs', type: 'blob', sha: '1'.repeat(40), mode: '100644', url: 'https://…' },
        { path: 'Cargo.toml', type: 'blob', sha: '2'.repeat(40) },
        { path: 'README.md', type: 'blob', sha: '3'.repeat(40) },
        { path: 'src', type: 'tree', sha: '4'.repeat(40) },
      ],
    },
  });
  const r = await answer(new Request(`https://x/gh/o/r/tree/${'c'.repeat(40)}`), { store });
  const tree = await r.json();
  check('a tree keeps only the files that matter',
    tree.files.length === 2 && tree.files.every((f) => Object.keys(f).join() === 'path,sha'),
    JSON.stringify(tree.files));
  check('and is cached for a year', r.headers.get('cache-control') === 'public, max-age=31536000',
    r.headers.get('cache-control'));
  await answer(new Request(`https://x/gh/o/r/tree/${'c'.repeat(40)}`), { store });
  check('a commit does not change, so it is asked for once ever', asked.length === 1);
}

// 3. A token is sent when there is one, and never invented.
{
  github({ '/commits': commits });
  let asked = github({ '/commits': commits });
  await answer(new Request('https://x/gh/o/r/commits'), { store: bucket(), token: 'secret' });
  check('a token is sent when present', asked[0].auth === 'Bearer secret');
  asked = github({ '/commits': commits });
  await answer(new Request('https://x/gh/o/r/commits'), { store: bucket() });
  check('and no authorization header is sent when absent', asked[0].auth === null);
}

// 4. When GitHub says no, a stale answer beats an error page.
{
  const store = bucket();
  github({ '/commits': commits });
  await answer(new Request('https://x/gh/o/r/commits'), { store });
  github({ '/commits': 'fail' });
  // Age it past the minute it is considered fresh for.
  const key = [...store.held.keys()].find((k) => k.endsWith('commits.json'));
  const aged = JSON.parse(store.held.get(key));
  aged.at = Date.now() - 600_000;
  store.held.set(key, JSON.stringify(aged));
  const r = await answer(new Request('https://x/gh/o/r/commits'), { store });
  check('a refused request falls back to what was kept', r.status === 200 && (await r.json()).length === 1);
}

// 5. With nothing kept, it says why rather than pretending.
{
  github({ '/commits': 'fail' });
  const r = await answer(new Request('https://x/gh/o/r/commits'), { store: bucket() });
  check('and says so when there is nothing to fall back on',
    r.status === 502 && (await r.json()).error.includes('403'));
}

// 6. Works with no bucket at all — a laptop, a preview.
{
  github({ '/commits': commits });
  const r = await answer(new Request('https://x/gh/o/r/commits'), { store: null });
  check('no bucket is not an error, only a cost', r.status === 200);
}

// 7. The probe, which is the one call that decides whether any of the above
//    ever runs. A framework that normalises `/gh/` to `/gh` must not turn it
//    into "there is no proxy here".
for (const path of ['/gh/', '/gh']) {
  const r = await answer(new Request(`https://x${path}`, { method: 'OPTIONS' }), { store: null });
  check(`the probe is answered at ${path}`, r !== null && r.status === 200,
    r === null ? 'fell through as not ours' : `status ${r.status}`);
}
check('and a path that is not ours still falls through',
  (await answer(new Request('https://x/ghost'), { store: null })) === null);

console.log(failed ? `\n${failed} failed` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
