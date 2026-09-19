/**
 * What a commit added.
 *
 * A graph of a repository is interesting; a graph of *this commit* is useful,
 * and the difference is knowing which of it was not there before. This
 * answers that for the package graph — the same question will be worth asking
 * of files, symbols and effects, so it takes the shape of the answer rather
 * than the shape of packages.
 *
 * Compared by **name**, never by id. A crate that moved in the tree keeps its
 * name and changes its id, and calling that "new" would mark a rename as an
 * addition every time anybody tidied a workspace.
 */

import type { Package } from './types.js';

/** The ids — of nodes and of edges — that did not exist at the earlier commit. */
export interface Fresh {
  nodes: Set<string>;
  edges: Set<string>;
  /** Both together, which is what a renderer wants. */
  all: Set<string>;
}

/** How an edge between two packages is named, wherever one is named. */
export const edgeId = (from: string, to: string): string => `${from}→${to}`;

/**
 * Every internal dependency, as edges.
 *
 * A package's `deps` are the *names* a manifest lists, so an edge exists
 * where a dependency's name is also a package here. Everything else is an
 * external crate and is counted rather than drawn.
 */
export function packageEdges(packages: Package[]): { from: Package; to: Package }[] {
  const byName = new Map(packages.map((p) => [p.name, p]));
  const out: { from: Package; to: Package }[] = [];
  for (const from of packages) {
    for (const dep of from.deps) {
      const to = byName.get(dep);
      if (to && to.id !== from.id) out.push({ from, to });
    }
  }
  return out;
}

export function freshPackages(now: Package[], before: Package[] | null): Fresh {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  if (before) {
    const had = new Set(before.map((p) => p.name));
    for (const p of now) if (!had.has(p.name)) nodes.add(p.id);

    const hadEdge = new Set(
      packageEdges(before).map((e) => edgeId(e.from.name, e.to.name)),
    );
    for (const e of packageEdges(now)) {
      if (!hadEdge.has(edgeId(e.from.name, e.to.name))) edges.add(edgeId(e.from.id, e.to.id));
    }
  }
  return { nodes, edges, all: new Set([...nodes, ...edges]) };
}
