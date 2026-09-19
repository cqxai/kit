/**
 * What a commit added, and what it merely moved.
 *
 * The rule that matters is the second one: a crate compared by id would read
 * as new every time a workspace was tidied, and a graph that shouts "new" at
 * a rename teaches people to stop believing the highlight.
 */
import { freshPackages, packageEdges } from '../dist/engine/index.js';

let failed = 0;
const check = (what, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) console.log('  ok  ' + what);
  else { failed++; console.error(`FAIL: ${what} — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`); }
};
const pkg = (name, deps = [], id = `pkg:${name}`) =>
  ({ id, name, deps, files: 1, lines: 1, eff: {}, ext: 0, bins: [] });

const before = [pkg('core'), pkg('cli', ['core'])];

check('nothing changed is nothing new',
  [...freshPackages([pkg('core'), pkg('cli', ['core'])], before).all], []);

const added = [pkg('core'), pkg('cli', ['core', 'store']), pkg('store')];
const fresh = freshPackages(added, before);
check('a crate that was not there is new', [...fresh.nodes], ['pkg:store']);
check('and so is the edge that reaches it', [...fresh.edges], ['pkg:cli→pkg:store']);

// The one that would otherwise cry wolf.
const moved = [pkg('core', [], 'pkg:crates/core'), pkg('cli', ['core'], 'pkg:crates/cli')];
check('a crate that only moved is not new', [...freshPackages(moved, before).all], []);

check('with nothing to compare against, nothing is claimed',
  [...freshPackages(added, null).all], []);

// Manifests name dependencies; only the ones that are also crates here are edges.
check('an external dependency is not an edge',
  packageEdges([pkg('cli', ['core', 'serde']), pkg('core')]).map((e) => `${e.from.name}→${e.to.name}`),
  ['cli→core']);
check('and neither is a crate depending on itself',
  packageEdges([pkg('cli', ['cli'])]).length, 0);

console.log(failed ? `\n${failed} failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
