/**
 * The three calls to GitHub that are metered, answered once for everybody.
 *
 * Which commits a repository has, which files a commit has, and which
 * releases exist. Sixty an hour per address is enough for one person to
 * exhaust by exploring — and they do: reading deno spends it in minutes.
 * Everything expensive is *not* metered. File contents come from a CDN
 * straight to the browser and never pass through here.
 *
 * So this fronts the three and keeps what it learns in a bucket, which is
 * the part that matters: the cache is shared by every visitor, so a
 * repository somebody read an hour ago costs the next reader nothing. A
 * token raises the ceiling from sixty an hour to five thousand, and is
 * optional — without one this is still far better than sixty per browser,
 * because sixty per deployment buys a great many cached answers.
 *
 * A tree names the files of one commit and a commit does not change, so that
 * answer is kept for good. The other two describe a repository as it is now,
 * which is a different kind of fact, and are kept for a minute.
 *
 * What comes back is not what GitHub sent. A tree of deno is a quarter of a
 * megabyte of mode bits and blob urls, of which a reader needs two fields per
 * interesting file. Sending the rest would cost more than the request saved.
 *
 * Runtime-agnostic on purpose. It is a function from a Request to a Response,
 * so the Cloudflare Worker that serves the deka explorer and the route
 * handler that serves cqx.bio are each four lines around this.
 */

/**
 * Somewhere to keep an answer. Structural rather than named, so an R2 bucket
 * satisfies it without this package knowing what R2 is.
 */
export interface Store {
  get(key: string): Promise<{ json(): Promise<unknown> } | null>;
  put(
    key: string,
    value: string,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

export interface Gate {
  /** Where answers are kept. Null works, and costs a request every time. */
  store: Store | null;
  /**
   * A fine-grained token with read access to public repositories and nothing
   * else. Optional: without it this is rate limited as an anonymous caller,
   * which the shared cache makes survivable and a token makes a non-issue.
   */
  token?: string;
}

/** Only these, only GET, and only for a plausible repository. */
const AGENT = 'cqx';

const REPO = /^[\w.-]{1,39}\/[\w.-]{1,100}$/;
const SHA = /^[0-9a-f]{7,40}$/;

/** A commit does not change, so its tree is true for good. The other two
 *  describe a repository as it is now, which is a different kind of fact. */
const BRIEFLY = 60_000;

/**
 * Bumped whenever the shape of what is kept changes.
 *
 * Without it, a fix to what the worker returns is undone by the worker's own
 * cache: v1 held trees whose entries named their blob `blob`, and went on
 * serving them after the code stopped producing them. Kept for good means
 * kept for good.
 */
const SHAPE = 'v2';

const json = (body: unknown, seconds: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': `public, max-age=${seconds}`,
    },
  });

const refuse = (status: number, why: string) =>
  new Response(JSON.stringify({ error: why }), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });

interface Held<T> {
  at: number;
  value: T;
}

async function held<T>(gate: Gate, key: string, fresh: number): Promise<T | null> {
  try {
    const found = await gate.store?.get(key);
    if (!found) return null;
    const stored = (await found.json()) as Held<T>;
    if (fresh !== Infinity && Date.now() - stored.at > fresh) return null;
    return stored.value;
  } catch {
    return null;
  }
}

async function keep<T>(gate: Gate, key: string, value: T): Promise<void> {
  try {
    await gate.store?.put(key, JSON.stringify({ at: Date.now(), value } satisfies Held<T>), {
      httpMetadata: { contentType: 'application/json' },
    });
  } catch {
    // A full or unavailable bucket costs a request next time, not an answer now.
  }
}

async function ask<T>(gate: Gate, path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': AGENT,
      ...(gate.token ? { authorization: `Bearer ${gate.token}` } : {}),
    },
  });
  if (!response.ok) {
    // GitHub says why in the body, and "rate limit" and "bad credentials" want
    // different answers from whoever is reading this.
    const said = await response.text().catch(() => '');
    const why = said.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`github ${response.status}${why ? `: ${why}` : ''}`);
  }
  return (await response.json()) as T;
}

/**
 * Which commit each tag names.
 *
 * A release names a tag, and the rail needs a commit. Asking for a repository's
 * hundred most recent tags resolves most repositories in one request — and none
 * at all in a repository that publishes several crates, where those hundred are
 * mostly other crates' tags. rust-lang/regex releases `1.0.0` while its recent
 * tags are `rure-*` and `regex-syntax-*`, so every release came back unresolved.
 *
 * So: the cheap request first, then one lookup for each tag it missed. A tag
 * points where it points, so what is learned is kept for good and a second
 * reader pays for neither.
 */
async function resolveTags(gate: Gate, repo: string, tags: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const wanted = new Set(tags);
  if (wanted.size === 0) return found;

  const remembered = await Promise.all(
    [...wanted].map(async (tag) => [tag, await held<string>(gate, tagKey(repo, tag), Infinity)] as const),
  );
  for (const [tag, sha] of remembered) {
    if (sha) {
      found.set(tag, sha);
      wanted.delete(tag);
    }
  }
  if (wanted.size === 0) return found;

  try {
    const bulk = await ask<{ name: string; commit: { sha: string } }[]>(gate,
      `/repos/${repo}/tags?per_page=100`,
    );
    for (const t of bulk) {
      if (wanted.has(t.name)) {
        found.set(t.name, t.commit.sha);
        wanted.delete(t.name);
        await keep(gate, tagKey(repo, t.name), t.commit.sha);
      }
    }
  } catch {
    // The bulk request is an optimisation; without it every tag is looked up.
  }

  // Whatever is left, one at a time. Twenty at worst, once per repository ever.
  await Promise.all(
    [...wanted].map(async (tag) => {
      try {
        const ref = await ask<{ object: { sha: string; type: string; url: string } }>(gate,
          `/repos/${repo}/git/ref/tags/${encodeURIComponent(tag)}`,
        );
        // An annotated tag points at a tag object, which points at the commit.
        let sha = ref.object.sha;
        if (ref.object.type === 'tag') {
          const inner = await ask<{ object: { sha: string } }>(gate,
            `/repos/${repo}/git/tags/${sha}`,
          );
          sha = inner.object.sha;
        }
        found.set(tag, sha);
        await keep(gate, tagKey(repo, tag), sha);
      } catch {
        // A tag that cannot be resolved is listed and not offered.
      }
    }),
  );
  return found;
}

const tagKey = (repo: string, tag: string) =>
  `cache/${SHAPE}/${repo}/tags/${encodeURIComponent(tag)}.json`;

/** Manifests, the lockfile, and the code. The same rule the analysis uses. */
const interesting = (path: string) =>
  path.endsWith('.rs') ||
  path.endsWith('/Cargo.toml') ||
  path === 'Cargo.toml' ||
  path.endsWith('/Cargo.lock') ||
  path === 'Cargo.lock';

/**
 * Answers a `/gh/` request, or returns null when the path is not one.
 *
 * Null rather than a 404, so a caller that also serves a site can fall
 * through to it — and so the reader's one-off `OPTIONS /gh/` probe, which is
 * how it decides whether this exists at all, is answered here rather than by
 * whatever a framework does with an unmatched path.
 */
export async function answer(request: Request, gate: Gate): Promise<Response | null> {
  const url = new URL(request.url);
  // `/gh` as well as `/gh/`. The reader probes the trailing-slash form, and a
  // framework that normalises paths strips it before this ever runs — so the
  // probe answered 404 while every real call worked, which is the worst way
  // for this to fail: nothing looks wrong until somebody is rate limited.
  const here = url.pathname === '/gh' || url.pathname.startsWith('/gh/');
  if (!here) return null;
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-max-age': '86400',
        },
      });
    }
    if (request.method !== 'GET') return refuse(405, 'only GET');

    const parts = url.pathname.replace(/^\/gh\/?/, '').split('/').filter(Boolean);
    const [owner, name, what, arg] = parts;
    const repo = `${owner}/${name}`;

    // What GitHub thinks of us, which is the only way to tell a token that is
    // being sent from one that is not. Never the token itself — only whether
    // there is one, and what it buys.
    if (owner === '_status') {
      try {
        const seen = await fetch('https://api.github.com/rate_limit', {
          headers: {
            accept: 'application/vnd.github+json',
            'user-agent': AGENT,
            ...(gate.token ? { authorization: `Bearer ${gate.token}` } : {}),
          },
        });
        const body = (await seen.json()) as {
          resources?: { core?: { limit: number; remaining: number; reset: number } };
        };
        const core = body.resources?.core;
        return json(
          {
            tokenPresent: Boolean(gate.token),
            githubSaid: seen.status,
            limit: core?.limit ?? null,
            remaining: core?.remaining ?? null,
            // 60 means unauthenticated whatever the worker believes it sent.
            authenticated: (core?.limit ?? 0) > 60,
          },
          0,
        );
      } catch (e) {
        return refuse(502, e instanceof Error ? e.message : String(e));
      }
    }

    if (!owner || !name || !REPO.test(repo)) return refuse(400, 'not a repository');

    try {
      if (what === 'commits') {
        const key = `cache/${SHAPE}/${repo}/commits.json`;
        const kept = await held<unknown[]>(gate, key, BRIEFLY);
        if (kept) return json(kept, 60);
        const raw = await ask<
          { sha: string; commit: { message: string; author: { name: string; date: string } } }[]
        >(gate, `/repos/${repo}/commits?per_page=20`);
        // Only what a rail shows.
        const commits = raw.map((c) => ({
          sha: c.sha,
          short: c.sha.slice(0, 8),
          subject: c.commit.message.split('\n')[0] ?? '',
          author: c.commit.author.name,
          date: c.commit.author.date,
        }));
        await keep(gate, key, commits);
        return json(commits, 60);
      }

      if (what === 'releases') {
        const key = `cache/${SHAPE}/${repo}/releases.json`;
        const kept = await held<unknown[]>(gate, key, BRIEFLY);
        if (kept) return json(kept, 60);

        const raw = await ask<
          { tag_name: string; published_at: string; draft: boolean; prerelease: boolean }[]
        >(gate, `/repos/${repo}/releases?per_page=20`);
        const visible = raw.filter((r) => !r.draft);
        const resolved = await resolveTags(gate,
          repo,
          visible.map((r) => r.tag_name),
        );
        const releases = visible.map((r) => ({
          tag: r.tag_name,
          sha: resolved.get(r.tag_name) ?? null,
          publishedAt: r.published_at,
          prerelease: r.prerelease,
        }));
        await keep(gate, key, releases);
        return json(releases, 60);
      }

      if (what === 'tree' && arg) {
        if (!SHA.test(arg)) return refuse(400, 'not a commit');
        // Kept for good: the files of a commit are what they were.
        const key = `cache/${SHAPE}/${repo}/tree/${arg}.json`;
        const kept = await held<unknown>(gate, key, Infinity);
        if (kept) return json(kept, 31536000);
        const raw = await ask<{
          sha: string;
          truncated: boolean;
          tree: { path: string; type: string; sha: string }[];
        }>(gate, `/repos/${repo}/git/trees/${arg}?recursive=1`);
        const tree = {
          sha: raw.sha,
          truncated: raw.truncated,
          // Two fields per file that matters, out of the eight GitHub sends
          // for every file there is. Named as GitHub names them: the reader
          // keys its cache on `sha`, and calling it something else here made
          // every file share one key and take the first file's contents.
          files: raw.tree
            .filter((e) => e.type === 'blob' && interesting(e.path))
            .map((e) => ({ path: e.path, sha: e.sha })),
        };
        await keep(gate, key, tree);
        return json(tree, 31536000);
      }

      return refuse(404, 'no such thing here');
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      // A stale answer beats none: a repository's commits from an hour ago are
      // still its commits, with one perhaps missing.
      const stale =
        what === 'commits' || what === 'releases'
          ? await held<unknown>(gate, `cache/${SHAPE}/${repo}/${what}.json`, Infinity)
          : null;
      if (stale) return json(stale, 60);
      return refuse(502, `github would not answer: ${why}`);
    }
  }
