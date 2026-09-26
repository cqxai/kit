/**
 * What a deployment's manifest means.
 *
 * One rule, and it is the one that was wrong: a field that is absent is not
 * the same as a field that is present and null. cqx.dev said it had no
 * default repository and listed four as suggestions, and `??` handed it the
 * first suggestion — so the home link in its header went to `denoland/deno`
 * from then on, whatever you were reading.
 */
import { loadCatalog } from '../dist/engine/index.js';

let failed = 0;
const check = (what, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) console.log('  ok  ' + what);
  else { failed++; console.error(`FAIL: ${what} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
};

/** Answers the one request loadCatalog makes. */
const serving = (body, type = 'application/json') => {
  globalThis.fetch = async () =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      headers: { 'content-type': type },
    });
};

const entries = [{ repo: 'a/b' }, { repo: 'c/d' }];

serving({ entries });
check('an absent default is inferred from the entries', (await loadCatalog()).default, 'a/b');

serving({ default: null, entries });
check('an explicit null default means none', (await loadCatalog()).default, null);

serving({ default: 'x/y', entries });
check('a named default is honoured', (await loadCatalog()).default, 'x/y');

serving({ default: 'x/y' });
check('a named default needs no entries', (await loadCatalog()).default, 'x/y');

// A single-page fallback answers an unmatched path with the page itself, so a
// missing manifest arrives as 200 with HTML. Content type is what tells them
// apart, and getting it wrong would parse a web page as a manifest.
serving('<!doctype html><title>404</title>', 'text/html');
const undeclared = await loadCatalog();
check('an HTML answer is not a manifest', [undeclared.default, undeclared.brand], [null, null]);

serving({ entries: [{ repo: 'a/b' }, { nope: true }, null] });
check('entries that name nothing are dropped', (await loadCatalog()).entries, [{ repo: 'a/b' }]);

globalThis.fetch = async () => { throw new Error('offline'); };
check('an unreachable manifest is not fatal', (await loadCatalog()).entries, []);

console.log(failed ? `\n${failed} failed` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
