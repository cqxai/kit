/**
 * A file's text, at the commit the report is of.
 *
 * The report carries one line per finding, which is enough to say what is
 * wrong and not enough to see why. Context comes from the repository itself,
 * at the exact commit — raw.githubusercontent.com, which is a CDN: neither
 * metered nor origin-restricted, so no token, worker or bucket is involved.
 * This is the same route the in-browser analyser already takes to read a
 * repository, for the same reason.
 *
 * Immutable by construction. A commit's file is what it was, so a fetch is
 * made once per (repo, ref, path) and the promise itself is kept — two cards
 * opening the same file at once share one request rather than racing.
 *
 * Failure is a `null`, not a throw. A private repository, an offline viewer
 * or a file that has since been deleted are all ordinary, and the card falls
 * back to the single line the report already carried. Losing the context is
 * a smaller loss than losing the finding.
 */

const RAW = 'https://raw.githubusercontent.com';

const held = new Map<string, Promise<string[] | null>>();

/** How much of a file is worth holding. Past this, a viewer is not the tool. */
const LIMIT = 2_000_000;

export function sourceOf(repo: string, ref: string, path: string): Promise<string[] | null> {
  const key = `${repo}@${ref}:${path}`;
  let waiting = held.get(key);
  if (!waiting) {
    waiting = fetchLines(repo, ref, path);
    held.set(key, waiting);
  }
  return waiting;
}

/** What is already in hand, for a render that must not wait. */
export function sourceHeld(repo: string, ref: string, path: string): string[] | null {
  return settled.get(`${repo}@${ref}:${path}`) ?? null;
}

const settled = new Map<string, string[]>();

async function fetchLines(repo: string, ref: string, path: string): Promise<string[] | null> {
  try {
    const response = await fetch(`${RAW}/${repo}/${ref}/${path}`);
    if (!response.ok) return null;
    const length = Number(response.headers.get('content-length') ?? 0);
    if (length > LIMIT) return null;
    const text = await response.text();
    if (text.length > LIMIT) return null;
    // Split once. Every zoom is a slice of this, and re-splitting a
    // ten-thousand-line file on each keystroke is work nobody asked for.
    const lines = text.split('\n');
    settled.set(`${repo}@${ref}:${path}`, lines);
    return lines;
  } catch {
    return null;
  }
}
