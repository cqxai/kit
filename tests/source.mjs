/**
 * Reading a finding's file back out of the repository.
 *
 * Three things have to hold, and the middle one is the reason this exists:
 * a card that re-fetches on every render would turn one rule with eight
 * findings into eight requests for the same file, and twelve cards on a
 * report into a hundred.
 */
import { sourceOf, sourceHeld } from '../dist/engine/index.js';

let failed = 0;
const check = (what, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) console.log('  ok  ' + what);
  else { failed++; console.error(`FAIL: ${what} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
};

let asked = [];
const serving = (status, body, headers = {}) => {
  asked = [];
  globalThis.fetch = async (url) => {
    asked.push(String(url));
    return new Response(status === 200 ? body : null, { status, headers });
  };
};

serving(200, 'fn main() {\n    let _ = go();\n}\n');
const lines = await sourceOf('o/r', 'abc1234', 'src/main.rs');
check('a file comes back split into lines', lines, ['fn main() {', '    let _ = go();', '}', '']);
check('read from the commit that was scored, not from a branch',
  asked, ['https://raw.githubusercontent.com/o/r/abc1234/src/main.rs']);

// The same file again, from every card that mentions it.
await Promise.all([
  sourceOf('o/r', 'abc1234', 'src/main.rs'),
  sourceOf('o/r', 'abc1234', 'src/main.rs'),
]);
check('asked for once however many cards want it', asked.length, 1);
check('and is there without waiting, once it has been',
  sourceHeld('o/r', 'abc1234', 'src/main.rs')?.length, 4);

check('a different commit is a different file', sourceHeld('o/r', 'def5678', 'src/main.rs'), null);

// A finding whose `file` is a symbol id, a private repository, a deleted
// file: all ordinary, and none of them may take the finding down with them.
serving(404, null);
check('a file that will not come back is a null, not a throw',
  await sourceOf('o/r', 'abc1234', 'gone.rs'), null);

globalThis.fetch = async () => { throw new Error('offline'); };
check('and neither is a network that is not there',
  await sourceOf('o/r', 'abc1234', 'other.rs'), null);

serving(200, 'x', { 'content-length': String(9_000_000) });
check('a file too big to read is refused before it is read',
  await sourceOf('o/r', 'abc1234', 'huge.rs'), null);

console.log(failed ? `\n${failed} failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
