/**
 * Where a dataset is asked for.
 *
 * The rule that matters is the version in the address. A dataset is named by
 * its commit and never changes — until cqx learns to write something new
 * down, every dataset is re-exported at the same commit, and a browser
 * holding the old bytes is entitled to keep them. Putting the expected
 * version in the URL means a schema bump clears every cache on the way,
 * without anybody clearing anything.
 */
import { install, useStore, loadIndex, loadDataset, CQX_VERSION } from '../dist/engine/index.js';

let failed = 0;
const check = (what, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) console.log('  ok  ' + what);
  else { failed++; console.error(`FAIL: ${what} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
};

install({ analyse: () => { throw new Error('not here'); }, read: () => { throw new Error('not here'); },
  wasm: '', store: 'https://data.example' });

let asked = [];
const serving = (body, type = 'application/json') => {
  asked = [];
  globalThis.fetch = async (url) => {
    asked.push(String(url));
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      headers: { 'content-type': type },
    });
  };
};

serving({ repo: 'o/r', commits: [] });
await loadIndex('o/r');
check('the index is asked for at the version this kit expects',
  asked, [`https://data.example/o/r/index.json?v=${CQX_VERSION}`]);

serving({ repo: 'o/r', score: {} });
await loadDataset('o/r', 'abc1234');
check('and so is a commit', asked, [`https://data.example/o/r/abc1234.json?v=${CQX_VERSION}`]);

// A deployment that exported datasets beside itself is asked first, and the
// shared store only when it has nothing.
useStore('/data');
serving({ repo: 'o/r', commits: [] });
await loadIndex('o/r');
check('a deployment with its own datasets is asked first',
  asked[0], `/data/o/r/index.json?v=${CQX_VERSION}`);

// A single-page fallback answers an unmatched path with the page itself, so
// a missing dataset arrives as 200 with HTML. Content type is the only thing
// that tells it apart from an answer.
globalThis.fetch = async (url) => {
  asked.push(String(url));
  return new Response('<!DOCTYPE html>', { headers: { 'content-type': 'text/html' } });
};
asked = [];
check('HTML at 200 is a miss, not a dataset', await loadDataset('o/r', 'abc1234'), null);
check('and both bases were tried before giving up', asked.length, 2);

useStore(null);
console.log(failed ? `\n${failed} failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
