/**
 * Every default the explorer has an opinion about, in one place.
 *
 * This file is the reason the package exists. cqx.bio and the deka explorer
 * render the same data and answer the same questions, and the moment one of
 * them decides that a repository opens on its latest release while the other
 * opens on its latest commit, the two are different products that happen to
 * share a name. Changing a number here and publishing changes it everywhere
 * on the next bump, which is the whole trick — a decision, made once.
 *
 * Nothing here is tuning. Each value is a judgement that was argued about
 * once and should not have to be argued about again in a second codebase,
 * so each one says what it is for rather than only what it is.
 */
export interface Policy {
  /**
   * What a repository shows when you arrive without naming a commit.
   *
   * `release`, because a tag is a thing its authors chose to publish and a
   * commit is a thing that happened. Walking releases also shows movement:
   * per-commit differences are usually nothing, and two releases apart is
   * where a score actually changes.
   */
  opensAt: 'release' | 'commit';

  /** How many commits the time machine offers. */
  commits: number;

  /** How many releases it offers. */
  releases: number;

  /**
   * Source files above which the reading is divided between threads.
   *
   * Below this a single reader finishes in about a second and the second
   * thread spends longer starting than it saves: several instances of a
   * multi-megabyte module, a round trip for the threads, and a merge over
   * facts that would not have needed merging.
   */
  divideAbove: number;

  /**
   * How many readers at most.
   *
   * Four, and not more. Eight finish makepad in 10.8 seconds against four
   * readers' 11.6, which is not worth four more threads: the parse stops
   * dividing cleanly well before the thread count runs out.
   */
  readers: number;

  /**
   * Requests in flight to the CDN at once, shared between the readers.
   *
   * Twelve saturates an HTTP/2 connection — measured at 13.4 MB/s against
   * 7.8 at twenty-four and 6.5 at ninety-six. It is a property of the
   * connection rather than of the caller, so readers take a share each
   * rather than twelve apiece.
   */
  lanes: number;

  /**
   * How long a list that can go stale is trusted, in milliseconds.
   *
   * Only timelines need this. Everything else is addressed by a commit or a
   * blob and can never be stale, but a repository grows new commits and a
   * timeline that hid one would be worse than a request.
   */
  freshFor: number;
}

export const policy: Policy = {
  opensAt: 'release',
  commits: 20,
  releases: 20,
  divideAbove: 1200,
  readers: 4,
  lanes: 12,
  freshFor: 60_000,
};

/**
 * The version of cqx this kit expects, and the module it fetches.
 *
 * Pinned here rather than in each consumer's package.json, so a module bump
 * is one change rather than three that can disagree.
 */
export const CQX_VERSION = 'v0.1.16';
