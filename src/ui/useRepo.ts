'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  install,
  type Host,
  heldDataset,
  holdDataset,
  host,
  policy,
  type Commit,
  type Dataset,
  loadCatalog,
  type Catalog,
  loadDataset,
  loadIndex,
  useStore,
  type RepoIndex,
  liveDataset,
  liveIndex,
  type Stage,
  fetchCommits,
  fetchReleases,
  type ReleaseRef,
  defaultView,
  parsePath,
  sameView,
  toPath,
  type View,
} from '../engine/index.js';
import { transition } from './transition.js';

/**
 * Everything a repository page knows before it has decided what to look like.
 *
 * This was the first two hundred lines of `Explorer`, and it stayed there for
 * as long as there was one way to draw a repository. There are two now — the
 * report and the profile — and they disagree about the layout, the menu and
 * the front page, while agreeing exactly about which commit is being read and
 * how it got here. A second copy of this is a second answer to "what is head",
 * and the two would drift on the first bug either of them fixed.
 *
 * Nothing here renders. What comes back is what is known.
 */
export type Repo = {
  /** What this deployment is, once it has said. */
  catalog: Catalog | null;
  /** The report on screen, or null while the first one is on its way. */
  data: Dataset | null;
  /** Which commit `data` describes — not necessarily the one being asked for. */
  shownAt: string | null;
  /** The commit being asked for, published or not. */
  at: string | null;
  /** Commits newest first: what CI published, merged with what GitHub lists. */
  timeline: Commit[];
  /** Commits with published data older than the one on screen, newest first. */
  earlier: string[];
  releases: ReleaseRef[] | null;
  releasesTrouble?: string;
  /** Why the timeline is empty, when the report beside it is not. */
  timelineTrouble: string | null;
  /** Which slot on the timeline is on screen, or -1 for a commit it omits. */
  viewing: number;
  view: View;
  go: (patch: Partial<View>) => void;
  /** What an analysis running in this tab is doing, when one is. */
  stage: Stage | null;
  error: string | null;
  /** Held while a repository is being swapped, so the page keeps its height. */
  held: number | null;
  /** Put on whatever element owns the report's height. */
  main: React.RefObject<HTMLElement | null>;
};

/**
 * `seed` is the address, as a server already parsed it.
 *
 * Without one this hook knows nothing until it has mounted and read
 * `location`, so a server renders a page with no repository on it — which is
 * what cqx.dev shipped: fourteen kilobytes of HTML saying "Nothing to open".
 * A deployment that knows the path before it renders passes it here and the
 * first render is the right one, on the server and in the browser both.
 *
 * Optional because the desktop application has no server to parse anything,
 * and because a page under a single-page fallback is served from an address
 * the build never saw.
 */
export function useRepo(host: () => Host, seed?: View | null): Repo {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  // The timeline and the commit are fetched separately on purpose: the timeline
  // is one small file that changes, and a commit is a large one that never
  // does. Moving through the time machine costs one immutable fetch.
  //
  // Held with the repository it describes. Without that, changing repository
  // leaves the old timeline standing for a render, and the head it names gets
  // written into the new repository's address — which then has no dataset.
  const [index, setIndex] = useState<{ of: string; timeline: RepoIndex } | null>(null);
  // Releases, held separately from the timeline: they always come from the API
  // — a published repository's own store knows nothing about tags — and a
  // repository that has never released anything still has a timeline. Null
  // means "asked for, not answered yet".
  const [releases, setReleases] = useState<{
    of: string;
    list: ReleaseRef[];
    /** Why the list is empty, when it is empty for a reason. */
    trouble?: string;
  } | null>(null);
  const [data, setData] = useState<Dataset | null>(null);
  // Which commit the report on screen is of. Not the same as the commit being
  // asked for: the address changes the moment it is clicked and the report
  // arrives afterwards, and anything derived from the address while the old
  // report is still up describes neither of them.
  const [shownAt, setShownAt] = useState<string | null>(null);
  // Changing repository is the one case where the report genuinely has to go:
  // it is about something else. Letting the page collapse to fetch the next one
  // pulls the colophon two thousand pixels up the screen and drops it back, so
  // the space it occupied is held until there is something to put in it.
  const main = useRef<HTMLElement>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  /** Why the rail is empty, when the report beside it is not. */
  const [timelineTrouble, setTimelineTrouble] = useState<string | null>(null);
  // One object rather than five pieces of state, because the URL describes all
  // of it at once and they have to stay in step.
  const [view, setView] = useState<View>(() => seed ?? defaultView(''));
  const { repo: source } = view;

  /** Changes the view and records it, so back returns here. */
  const go = (patch: Partial<View>) => {
    // Faded, because an elevation swaps its whole contents at once and a hard
    // cut reads as a flash. A commit fades later instead, when its report
    // arrives — that is the swap worth softening.
    transition(() =>
      setView((current) => {
        // Focus belongs to the thing that asked for it. Any other move — an
        // elevation, a scope, a commit — leaves it behind, or a row stays
        // pinned to the top of a list nobody searched.
        const next = { ...current, focus: null, ...patch };
        if (sameView(current, next)) return current;
        window.history.pushState(next, '', toPath(next));
        // A different elevation or a different scope is a different view, and
        // it starts at its beginning. A commit is not a different view: it is
        // the same one a moment earlier, which is the whole point of stepping
        // through them, so the page stays exactly where it is.
        const moved =
          next.level !== current.level || next.pkg !== current.pkg || next.file !== current.file;
        if (moved) window.scrollTo({ top: 0 });
        return next;
      }),
    );
  };

  useEffect(() => {
    let live = true;
    // Before anything asks the engine for anything. Called here rather than
    // at import because it reads `location`, and this renders on a server
    // too — where there is none.
    install(host());

    // The address, read now rather than when a manifest comes back.
    //
    // This used to sit inside the `then` below, which meant the page did not
    // know which repository it was showing until a network round trip had
    // finished — and on a deployment with no manifest that round trip returns
    // nothing, after paying for itself in full. The name, the cover and the
    // whole header waited behind a fetch that had no opinion about them.
    //
    // An address always wins. The manifest says what to open *with*, not what
    // is allowed: a repository nobody listed is still a repository, so it is
    // only consulted when the address names none.
    //
    // Replaces the history entry rather than adding one — arriving on a link
    // should not take two backs to leave.
    const fromUrl = parsePath(window.location.pathname, window.location.hash, '');
    if (fromUrl.repo) {
      setView((current) => (sameView(current, fromUrl) ? current : fromUrl));
      window.history.replaceState(fromUrl, '', toPath(fromUrl));
    }

    loadCatalog().then((found) => {
      if (!live) return;
      useStore(found.store);
      setCatalog(found);
      if (fromUrl.repo || !found.default) return;
      const resolved = { ...fromUrl, repo: found.default };
      setView(resolved);
      window.history.replaceState(resolved, '', toPath(resolved));
    });

    const onPop = () =>
      setView((current) => parsePath(window.location.pathname, window.location.hash, current.repo));
    window.addEventListener('popstate', onPop);
    return () => {
      live = false;
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    if (!source) return;
    // Nothing may be fetched before the manifest has answered, because the
    // manifest is what says *where from*: a deployment that exported its
    // datasets beside itself declares `/data`, and a fetch issued before that
    // is heard goes to the shared store and misses. Reading the address no
    // longer waits for this — only reading bytes does, which is the part that
    // genuinely depends on it.
    if (!catalog) return;
    let live = true;
    // Read before anything is cleared, while the previous report is still up.
    setHeld(main.current?.offsetHeight ?? null);
    setIndex(null);
    setData(null);
    setShownAt(null);
    setError(null);
    setTimelineTrouble(null);
    setReleases(null);
    // Published first, because it is already analysed. A repository nobody has
    // exported still has commits, and they cost one request to list.
    loadIndex(source)
      .then((found) => found ?? liveIndex(source))
      .then((found) => { if (live) setIndex({ of: source, timeline: found }); })
      .catch((e: Error) => {
        if (!live) return;
        // An address that names a commit does not need the timeline to show
        // that commit: the dataset may well be held already, and the rail is
        // the only part that cannot be drawn.
        if (view.ref) setTimelineTrouble(e.message);
        else setError(e.message);
      });
    fetchReleases(source, policy.releases)
      .then((list) => { if (live) setReleases({ of: source, list }); })
      // A refused request is not an absence of releases, and saying so would
      // be telling the reader something untrue about their repository.
      .catch((e: Error) => {
        if (live) setReleases({ of: source, list: [], trouble: e.message });
      });
    return () => { live = false; };
  }, [source, catalog]);

  // Newest first: the first entry is head, each one after it a commit further back.
  const repoIndex = index?.of === source ? index.timeline : null;
  const published = useMemo(
    () => (repoIndex ? [...repoIndex.commits].reverse() : []),
    [repoIndex],
  );
  // A published repository's index carries the five commits its CI exported,
  // and the rail asks for twenty. Filling the difference with empty slots said
  // fifteen commits were still arriving when nothing was: they had simply
  // never been published.
  const [extra, setExtra] = useState<{ of: string; commits: Commit[] } | null>(null);
  useEffect(() => {
    if (!source || published.length === 0 || published.length >= policy.commits) return;
    let live = true;
    fetchCommits(source, policy.commits)
      .then((found) => {
        if (!live) return;
        setExtra({
          of: source,
          commits: found.map((c) => ({ ...c, lines: 0, scores: {}, delta: {} })),
        });
      })
      // The rail is worth having with five entries; a refused request is not
      // worth an error over.
      .catch(() => {});
    return () => { live = false; };
  }, [source, published.length]);

  // The commits that can be compared against: the ones CI actually exported,
  // older than the one being read, newest first.
  //
  // Not simply the next entry in the rail. The rail merges the five commits a
  // repository published with the twenty GitHub lists, so the entry below the
  // one on screen is usually a commit nobody ever scored — asking the store
  // for it gets a 404 and the reader is told nothing is new when the truth is
  // that nothing was compared.
  const earlier = useMemo(() => {
    const shownDate = published.find((c) => c.short === shownAt)?.date;
    return published
      .filter((c) => c.short !== shownAt && (!shownDate || c.date < shownDate))
      .map((c) => c.short);
  }, [published, shownAt]);

  const timeline = useMemo(() => {
    if (extra?.of !== source) return published;
    // What is published wins where it exists: it carries the scores.
    const known = new Map(published.map((c) => [c.short, c]));
    return extra.commits.map((c) => known.get(c.short) ?? c);
  }, [published, extra, source]);

  // Releases are fetched independently of the timeline above, so they can lag
  // a render behind a repository change — the guard keeps the previous
  // repository's list from flashing under the new one's tabs for a frame.
  const releaseList = releases?.of === source ? releases.list : null;
  const releaseTrouble = releases?.of === source ? releases.trouble : undefined;
  //
  // `policy.opensAt` said `release` and only the tab listened: the rail opened
  // on releases while the report underneath was of the newest commit, so the
  // highlighted release and the thing being read were two different commits.
  //
  // `undefined` is the third answer and the one that matters — releases have
  // been asked for and not answered. Reading head in the meantime would load
  // a large file, show it, and then replace it a moment later.
  const opening = useMemo((): string | null | undefined => {
    if (policy.opensAt !== 'release') return null;
    if (!releaseList) return releaseTrouble ? null : undefined;
    // The newest release whose commit could be resolved. A tag GitHub did not
    // return in the bulk lookup names no sha and cannot be opened.
    return releaseList.find((r) => r.sha)?.sha?.slice(0, 8) ?? null;
  }, [releaseList, releaseTrouble]);

  const at =
    view.ref ?? (opening === undefined ? null : (opening ?? timeline[0]?.short ?? null));

  useEffect(() => {
    if (!source || !at) return;
    // Already on screen. The timeline is in this effect's dependencies
    // because resolving a short ref to the commit it names needs it — and the
    // timeline changes shape once more after it first arrives, when the
    // commits GitHub lists are merged into the ones CI published. That second
    // change re-ran this and fetched the same dataset a second time: 460KB
    // re-read and re-parsed, and every derived view rebuilt, for a report
    // already sitting on the page.
    if (shownAt === at && data) return;
    let live = true;
    // Deliberately not clearing the report: the commit is changing, not the
    // repository, and a page that empties itself to fetch its replacement
    // flashes the whole of its content on every click.
    setStage(null);
    // Three places, in this order, and the order is the whole of the policy.
    //
    //   1. this browser — what it already holds, however it came by it
    //   2. the store — what a trusted machine published
    //   3. the analysis — read the repository again, in this tab
    //
    // It used to be 2 then 3, with 1 consulted only from inside 3. That cost
    // a network round trip on every visit to a repository the store holds,
    // because nothing from the store was ever written here; and a request and
    // a 404 before the local answer was looked for on one it does not.
    heldDataset(source, at)
      .then(async (mine) => {
        if (!live) return mine;
        if (mine) return mine;
        const published = await loadDataset(source, at);
        // Keep what the store gave us. It is immutable — it names one commit
        // and one version of cqx — so the next visit has no reason to ask.
        if (published) {
          void holdDataset(source, at, published);
          return published;
        }
        // Nothing anywhere. The source is still there to read, and this tab
        // reads it — but the fact that it had to is worth telling somebody,
        // so that the next reader does not repeat it. The fact only: what
        // this browser computes stays in this browser.
        const sha = timeline.find((c) => c.short === at)?.sha ?? at;
        try {
          host().cold?.(source, sha);
        } catch {
          // A deployment's reporting is not allowed to break its reports.
        }
        try {
          return await liveDataset(source, sha, (s) => { if (live) setStage(s); });
        } finally {
          if (live) setStage(null);
        }
      })
      .then((found) => {
        if (!live) return;
        if (found) {
          // The report on screen is the previous commit's. This is the moment
          // it becomes another's, so it is the moment worth fading.
          transition(() => {
            setData(found);
            setShownAt(at);
            setHeld(null);
          });
          return;
        }
        // The store keeps every commit it has ever been given, so an address
        // off the rail is usually still there. When it is not, the repository
        // itself is still meaningful, so this drops to its head rather than
        // dead-ending. In place, so the bad address does not become somewhere
        // the back button returns to.
        const head = timeline[0]?.short;
        if (head && head !== at) {
          setView((current) => {
            const canonical = { ...current, ref: head };
            window.history.replaceState(canonical, '', toPath(canonical));
            return canonical;
          });
          return;
        }
        throw new Error(`${source} has a timeline, but nothing has been exported at ${at}.`);
      })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [source, at, timeline, shownAt, data]);

  useEffect(() => {
    // An address without a commit is not a stable address, so once the head is
    // known the URL is completed in place rather than by adding an entry.
    if (!at || view.ref === at) return;
    const canonical = { ...view, ref: at };
    setView(canonical);
    window.history.replaceState(canonical, '', toPath(canonical));
  }, [view, at]);

  /**
   * Which commit the report describes. Differs from `ref` while one is
   * arriving: the menu answers the click immediately, because a menu that does
   * not respond for a second feels broken, and the report goes on describing
   * itself truthfully until it is replaced.
   */
  const viewing = timeline.findIndex((c) => c.short === shownAt);

  return {
    catalog,
    data,
    shownAt,
    at,
    timeline,
    earlier,
    releases: releaseList,
    releasesTrouble: releaseTrouble,
    timelineTrouble,
    viewing,
    view,
    go,
    stage,
    error,
    held,
    main,
  };
}
