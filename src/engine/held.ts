/**
 * What this browser has already worked out, and what it was given.
 *
 * The order a repository is looked for in is, deliberately:
 *
 *   1. here — what this browser already holds
 *   2. the store — what a trusted machine published
 *   3. the analysis — read it again, in this tab
 *
 * It used to be 2, 3, and here was consulted only from inside 3. That has two
 * costs. A repository the store *does* hold is fetched over the network on
 * every visit, because nothing written to this browser ever came from the
 * store. And a repository it does not hold pays a request and a 404 before
 * the local answer is even looked for.
 *
 * Both halves are kept here, in one module, because they are one cache: the
 * analysis worker writes what it computed and the page reads it back, and a
 * second implementation of the address is how the two stop agreeing.
 *
 * Nothing that lands here ever leaves this browser. A dataset this tab
 * computed is fine for the person who is looking at it and is not evidence of
 * anything — what a repository scores, for everybody else, is decided by a
 * machine nobody can reach.
 */
import { CQX_VERSION } from './policy.js';
import type { Dataset } from './types.js';

/** Bumped when the stored shape changes, not when cqx does — that is the key. */
const DATASETS = 'cqx-datasets-v2';

/**
 * A commit, and the version of cqx that read it.
 *
 * The version belongs in the address for the same reason the store's URL
 * carries `?v=`: a dataset is only true of the engine that produced it, and an
 * upgrade that goes on serving the previous engine's answer produces a score
 * nobody can account for.
 */
export const heldAt = (repo: string, sha: string): string =>
  `https://cqx.invalid/dataset/${CQX_VERSION}/${repo}/${sha}`;

/** What the analysis worker stores beside the dataset: what the run cost. */
export interface Held {
  json: string;
  ms: number;
  fetch: number;
  readers: number;
  held: number;
  folding?: number;
}

async function open(): Promise<Cache | null> {
  try {
    return await caches.open(DATASETS);
  } catch {
    // Private windows, blocked storage, a cache that misbehaves.
    return null;
  }
}

/** The raw entry, for the worker, which wants the timings as well. */
export async function heldEntry(repo: string, sha: string): Promise<Held | null> {
  try {
    const hit = await (await open())?.match(heldAt(repo, sha));
    if (!hit) return null;
    const out = (await hit.json()) as Held;
    return { ...out, fetch: out.fetch ?? 0, readers: out.readers ?? 1, held: out.held ?? 0 };
  } catch {
    return null;
  }
}

export async function hold(repo: string, sha: string, entry: Held): Promise<void> {
  try {
    await (await open())?.put(
      heldAt(repo, sha),
      new Response(JSON.stringify(entry), { headers: { 'content-type': 'application/json' } }),
    );
  } catch {
    // Storage full or unavailable. Nothing here depends on it.
  }
}

/** The dataset itself, for the page, which wants a report. */
export async function heldDataset(repo: string, sha: string): Promise<Dataset | null> {
  const entry = await heldEntry(repo, sha);
  if (!entry) return null;
  try {
    const data = JSON.parse(entry.json) as Dataset & { error?: string };
    if (data.error) return null;
    data.analysis = {
      ms: entry.ms,
      cqx: data.analysis?.cqx ?? '',
      fetch: entry.fetch,
      readers: entry.readers,
      held: entry.held,
    };
    return data;
  } catch {
    // A truncated or half-written entry is a miss, not an error.
    return null;
  }
}

/**
 * Keep what the store gave us, so the next visit does not ask for it again.
 *
 * `fetch` is what it cost to be handed one, and the analysis time is whatever
 * the machine that produced it recorded — this browser did not analyse
 * anything and must not claim it did.
 */
export async function holdDataset(repo: string, sha: string, data: Dataset): Promise<void> {
  await hold(repo, sha, {
    json: JSON.stringify(data),
    ms: data.analysis?.ms ?? 0,
    fetch: data.analysis?.fetch ?? 0,
    readers: data.analysis?.readers ?? 1,
    held: data.analysis?.held ?? 0,
  });
}
