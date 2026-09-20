'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchMeta,
  type Host,
  type LevelId,
  type RepoMeta,
  type View,
} from '../../engine/index.js';
import { useRepo } from '../useRepo.js';
import { Header } from '../Header.js';
import { LevelView } from '../LevelView.js';
import { Search, useSearchKey } from '../Search.js';
import { Analysing, Working } from '../Loading.js';
import { EMPTY } from '../classes.js';
import { Cover } from './Cover.js';
import { Tabs, type Rung } from './Tabs.js';
import { Feed } from './Feed.js';
import { Rail } from './Rail.js';
import { Side } from './Side.js';
import { RailSkeleton } from './Skeleton.js';
import { useCondense } from './condense.js';

/**
 * A repository, as a page somebody comes back to.
 *
 * The report reads a repository once, top to bottom, and is built for the
 * cases where once is all there is — a folder on disk, a private repository
 * somebody asked about, a directory handed over. This is the other thing: a
 * project with a front, a history and a following, which somebody watches
 * rather than reads.
 *
 * The grammar is the profile page: a cover, an avatar breaking its lower
 * edge, a row of tabs under it, a column of facts on the left and a feed down
 * the middle. It is borrowed because it is the layout everybody already knows
 * how to read, and because a repository genuinely has the same shape — a
 * face, a description, friends, and a wall of things that happened to it.
 *
 * L0 is the timeline. The other elevations are the report's own views, shown
 * in this page's frame: one commit, at whatever depth was asked for. They are
 * not redesigned here, and are meant to be.
 */
export function Profile({ host }: { host: () => Host }) {
  const {
    catalog,
    data,
    shownAt,
    at,
    timeline,
    earlier,
    releases,
    timelineTrouble,
    viewing,
    view,
    go,
    stage,
    error,
    held,
    main,
  } = useRepo(host);
  const { repo: source, level } = view;
  const [searching, setSearching] = useState(false);
  useSearchKey(() => setSearching(true));

  // GitHub's own answer about the repository: the sentence under the name,
  // the licence, the age, the following. None of it is in a dataset, because
  // cqx reads code and none of this is code.
  const [meta, setMeta] = useState<{ of: string; meta: RepoMeta } | null>(null);
  useEffect(() => {
    if (!source) return;
    let live = true;
    // A profile without a description is a profile; one that fails to load
    // because a description could not be fetched is a broken page.
    fetchMeta(source)
      .then((found) => { if (live) setMeta({ of: source, meta: found }); })
      .catch(() => {});
    return () => { live = false; };
  }, [source]);
  const about = meta?.of === source ? meta.meta : null;

  const face = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const smallName = useRef<HTMLSpanElement>(null);
  const firstTab = useRef<HTMLButtonElement>(null);
  useCondense(face, row, chrome, smallName, firstTab);

  const avatar = about?.avatar ?? `https://github.com/${source.split('/')[0] ?? ''}.png`;

  const levels: Rung[] = [
    { id: 'L0', name: 'Timeline' },
    { id: 'L1', name: 'System' },
    { id: 'L2', name: 'Crates' },
    { id: 'L3', name: 'Files' },
    { id: 'L4', name: 'Types' },
    { id: 'L5', name: 'Functions' },
  ];

  // Which commits cqx actually has a report for. A commit with no scores was
  // never exported, and offering to open it leads somewhere that has to fetch
  // and analyse the whole repository first.
  const scored = useMemo(
    () => new Set(timeline.filter((c) => Object.keys(c.scores).length > 0).map((c) => c.short)),
    [timeline],
  );

  // One stop per commit, not per release. A release is a thing that happened
  // to a commit, so it takes that commit's place on the menu the same way it
  // takes its place in the feed — and a repository that releases at a normal
  // rate still gets a menu, which the by-release version did not: tokio had no
  // tagged commit in its twenty most recent and the whole history was one item.
  const tagged = useMemo(() => {
    const at = new Map<string, string>();
    for (const r of releases ?? []) if (r.sha) at.set(r.sha.slice(0, 8), r.tag);
    return at;
  }, [releases]);

  const stops = useMemo(() => {
    let last: string | null = null;
    return timeline.map((c) => {
      // The date only where it changes. Twenty commits from one afternoon
      // repeating the same date twenty times is a column of noise with the
      // one thing that distinguishes them — the commit — set smaller than it.
      const day = c.date.slice(0, 10);
      const when = day === last ? null : c.date;
      last = day;
      return {
        id: `at-${c.short}`,
        label: tagged.get(c.short) ?? c.short,
        when,
        tagged: tagged.has(c.short),
      };
    });
  }, [timeline, tagged]);

  const contributors = useMemo(() => {
    const seen: string[] = [];
    for (const c of timeline) if (c.author && !seen.includes(c.author)) seen.push(c.author);
    return seen;
  }, [timeline]);

  const packageName = view.pkg;
  const packageId =
    data && view.pkg ? (data.packages.find((p) => p.name === view.pkg)?.id ?? null) : null;
  const files = useMemo(
    () => (!data ? [] : packageId ? data.files.filter((f) => f.pkg === packageId) : data.files),
    [data, packageId],
  );
  const types = useMemo(() => {
    if (!data) return [];
    if (view.file) return data.types.filter((t) => t.file === view.file);
    if (packageId) return data.types.filter((t) => t.pkg === packageName);
    return data.types;
  }, [data, packageId, view.file, packageName]);
  const functions = useMemo(() => {
    if (!data) return [];
    if (view.file) return data.functions.filter((f) => f.file === view.file);
    if (packageId) return data.functions.filter((f) => f.pkg === packageName);
    return data.functions;
  }, [data, packageId, view.file, packageName]);

  const commit = timeline[viewing] ?? null;

  return (
    <div className="font-display text-[13px] leading-[1.42]">
      <Search data={data} open={searching} onClose={() => setSearching(false)} onGo={go} />
      <div ref={chrome} className="sticky top-0 z-40 bg-ground">
        <Header
          catalog={catalog}
          source={source}
          data={data}
          onGo={go}
          onSearch={() => setSearching(true)}
          // The cover carries the same numbers, 200px below and larger. Two
          // places saying it is a page that has not decided which is the answer.
          totals={false}
        />
      </div>

      {/* The page and the date menu are siblings, not parent and child: on the
          layout this borrows from the menu sat outside the content column
          against the right edge, and putting it inside would make it part of
          the card. */}
      <div className="mx-auto mb-16 grid justify-center px-4 side:grid-cols-[minmax(0,1000px)_92px]">
        <div className="min-w-0">
          {error ? (
            <div className={EMPTY}>{error}</div>
          ) : !source ? (
            <div className={EMPTY}>
              Nothing to open. This deployment lists no repository, so name one in the address —{' '}
              <code>/{'{owner}'}/{'{repo}'}</code>.
            </div>
          ) : (
            <>
              <Cover
                repo={source}
                meta={about}
                crates={data?.packages.length ?? 0}
                files={data?.files.length ?? 0}
                lines={data?.totals.lines ?? 0}
                packages={data?.packages ?? []}
                faceRef={face}
              />
              <Tabs
                repo={source}
                avatar={avatar}
                levels={levels}
                current={level}
                onSelect={(id: LevelId) => go({ level: id })}
                rowRef={row}
                nameRef={smallName}
                firstTabRef={firstTab}
              />

              <main
                ref={main}
                className="mt-8 min-h-[60vh] max-side:mt-3"
                style={held && !data ? { minHeight: held } : undefined}
              >
                {level === 'L0' ? (
                  <div className="grid items-start gap-3 side:grid-cols-[340px_minmax(0,1fr)]">
                    <Side
                      repo={source}
                      meta={about}
                      data={data}
                      at={shownAt}
                      commit={commit}
                      packages={data?.packages ?? []}
                      contributors={contributors}
                      waiting={!data && !error}
                      onGo={go}
                    />
                    <div className="min-w-0">
                      {/* Real progress where there is real progress to report.
                          A repository nobody has published is being read here,
                          in this tab, and that takes as long as it takes — a
                          skeleton would be pretending it is nearly done. The
                          phases say what is happening and the clock says how
                          long it has been, which is the honest pair. */}
                      {stage ? (
                        <div className="mb-3">
                          <Analysing repo={source} at={at} stage={stage} />
                        </div>
                      ) : null}
                      <Feed
                        repo={source}
                        avatar={avatar}
                        timeline={timeline}
                        releases={releases}
                        data={data}
                        at={shownAt}
                        scored={scored}
                        waiting={!stage && !error && !timelineTrouble}
                        onGo={go}
                      />
                    </div>
                  </div>
                ) : !data ? (
                  stage ? (
                    <Analysing repo={source} at={at} stage={stage} />
                  ) : (
                    <div className={EMPTY}>
                      Loading {source}
                      {at ? ` at ${at}` : ''}…
                    </div>
                  )
                ) : (
                  /* The other elevations are the report's own views, in this
                     page's frame. They have not been redesigned for a profile
                     and are meant to be — what is here is true, which is the
                     part that matters while the shell settles. */
                  <div
                    className={
                      stage ? '[&>*:not([role=status])]:opacity-45 [&>*]:transition-opacity' : undefined
                    }
                  >
                    {stage ? <Working at={at} stage={stage} /> : null}
                    <LevelView
                      level={level}
                      data={data}
                      timeline={timeline}
                      viewing={viewing}
                      at={shownAt}
                      repo={source}
                      earlier={earlier}
                      scopeName={packageName}
                      focus={view.focus}
                      files={files}
                      types={types}
                      functions={functions}
                      onGo={go}
                    />
                  </div>
                )}
              </main>
            </>
          )}
        </div>

        {level === 'L0' ? (
          stops.length === 0 && !error && !timelineTrouble ? <RailSkeleton /> : <Rail stops={stops} />
        ) : null}
      </div>
    </div>
  );
}
