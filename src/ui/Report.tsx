'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  type Host,
  policy,
  type Brand,
  sameView,
  type LevelId,
  type View,
} from '../engine/index.js';
import { useRepo } from './useRepo.js';
import { Header } from './Header.js';
import { ElevationRail, type Elevation } from './ElevationRail.js';
import { RepoInput } from './RepoInput.js';
import { ThemePicker } from './Theme.js';
import { TimeMachine, type TimeMachineTab } from './TimeMachine.js';
import { LevelView } from './LevelView.js';
import { Search, SearchButton, useSearchKey } from './Search.js';
import { Analysing, Working } from './Loading.js';
import { EMPTY } from './classes.js';

/** A crumb: a link unless it would land you where you already are. */
const CRUMB = 'cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-accent hover:underline';

/**
 * Where you are, and every way back to somewhere else.
 *
 * The scope used to be a sentence with one button after it, and the button
 * did the only thing the sentence could not say: clear. But every part of a
 * scope is an address the explorer already knows how to render — the
 * repository is its crates, a crate is its files, a file is its types — so
 * each part is a link, and "clear" is simply what the first one does.
 *
 * A crumb that would land you where you already are is not a link. That is
 * the file, usually, since the scope bar is only drawn once there is one; at
 * Functions it becomes a link again, back up to that file's types.
 */
function Scope({
  view,
  onGo,
}: {
  view: View;
  onGo: (patch: Partial<View>) => void;
}) {
  const crumbs: { label: string; dir?: string; patch: Partial<View> }[] = [
    { label: view.repo, patch: { pkg: null, file: null, level: 'L2' } },
  ];
  if (view.pkg) {
    crumbs.push({ label: view.pkg, patch: { pkg: view.pkg, file: null, level: 'L3' } });
  }
  if (view.file) {
    // The directories are context and the file is the thing, so they are
    // shown as one crumb and weighted differently. There is no crumb for a
    // directory because there is no view of one — scope is a crate and a
    // file, and inventing a level here would be inventing a lie.
    const cut = view.file.lastIndexOf('/');
    crumbs.push({
      label: cut < 0 ? view.file : view.file.slice(cut + 1),
      dir: cut < 0 ? undefined : view.file.slice(0, cut + 1),
      patch: { file: view.file, level: 'L4' },
    });
  }

  return (
    <nav
      className="mb-2.5 flex flex-wrap items-baseline gap-[7px] font-mono text-[12.5px]"
      aria-label="Scope"
    >
      {crumbs.map((crumb, i) => {
        // Compared against what `go` would actually produce, focus and all —
        // otherwise a crumb reads as current while clicking it would still
        // drop the symbol search had pinned.
        const here = sameView(view, { ...view, focus: null, ...crumb.patch });
        const inner = (
          <>
            {/* The directories are context; the file is the thing. */}
            {crumb.dir ? <em className="not-italic text-ink-faint">{crumb.dir}</em> : null}
            {crumb.label}
          </>
        );
        return (
          <span key={i} className="inline-flex min-w-0 items-baseline gap-[7px]">
            {i > 0 ? <i className="not-italic text-ink-faint" aria-hidden="true">/</i> : null}
            {here ? (
              <b className="font-semibold text-ink" aria-current="page">{inner}</b>
            ) : (
              <button type="button" className={CRUMB} onClick={() => onGo(crumb.patch)}>
                {inner}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/**
 * The report: one repository at one commit, read top to bottom.
 *
 * This is the whole of a repository in a single page, and it is built for the
 * cases where that is all there is — a folder on disk the CLI opened, a
 * private repository somebody asked for one report of, a directory exported
 * and handed to somebody else. It fetches when it can and works when it
 * cannot. Nothing here needs an account, a server or a second page.
 *
 * The website no longer opens this. A page somebody visits repeatedly, to
 * watch a repository rather than to read it once, is a different thing and
 * has its own shell — see `Profile`. The two share `useRepo`, because which
 * commit is being read is not a matter of taste.
 *
 * Scope persists downward: choosing a crate at L2 filters Files, Types and
 * Functions until it is cleared. L4 and L5 are siblings rather than a descent —
 * a file holds both, and what relates them is use, not containment.
 */




export function Report({ host }: { host: () => Host }) {
  // Everything about which repository, which commit and how it got here lives
  // in the hook, because the profile shell needs exactly the same answers and
  // two copies of them would drift on the first bug either one fixed.
  const {
    catalog,
    data,
    shownAt,
    timeline,
    earlier,
    releases: releaseList,
    releasesTrouble: releaseTrouble,
    timelineTrouble,
    viewing: commit,
    view,
    go,
    at,
    stage,
    error,
    held,
    main,
  } = useRepo(host);
  const { repo: source, level, ref } = view;
  // Which tab the time machine is showing is this layout's business, not the
  // repository's: the profile has no tabs, because its feed is one list.
  const [tab, setTab] = useState<TimeMachineTab | null>(null);
  const [searching, setSearching] = useState(false);
  useSearchKey(() => setSearching(true));
  // A repository change resets the choice, or a reader who picked commits on
  // one repository is shown commits on the next whatever it has.
  useEffect(() => { setTab(null); }, [source]);


  // Null (still asked for) reads as the default, releases. Only once the
  // answer is known to be empty does the fallback to commits apply — and only
  // until the reader picks a tab themselves, which is remembered from there.
  const effectiveTab: TimeMachineTab =
    tab ?? (releaseList && releaseList.length === 0 ? 'commits' : policy.opensAt === 'release' ? 'releases' : 'commits');

  const packageName = view.pkg;
  const packageId =
    data && view.pkg ? (data.packages.find((p) => p.name === view.pkg)?.id ?? null) : null;
  const filePath = view.file;
  const pkg = packageId;
  const file = filePath;

  const files = useMemo(
    () => (!data ? [] : pkg ? data.files.filter((f) => f.pkg === pkg) : data.files),
    [data, pkg],
  );
  const types = useMemo(() => {
    if (!data) return [];
    if (filePath) return data.types.filter((t) => t.file === filePath);
    if (pkg) return data.types.filter((t) => t.pkg === packageName);
    return data.types;
  }, [data, pkg, filePath]);
  const functions = useMemo(() => {
    if (!data) return [];
    if (filePath) return data.functions.filter((f) => f.file === filePath);
    if (pkg) return data.functions.filter((f) => f.pkg === packageName);
    return data.functions;
  }, [data, pkg, filePath]);

  // The elevations exist whether or not their contents have arrived, and they
  // keep their size while they wait. An empty count collapsed the line under
  // each name, taking 16px off every button and 96px off the rail — so the
  // page lost its left-hand side and put it back on every commit. Nothing is
  // known yet, and nothing is what zero says.
  const levels: Elevation[] = !source || error ? [] : [
    { id: 'L0', name: 'Score', count: `${data ? Object.keys(data.score.scores).length : 0} categories` },
    { id: 'L1', name: 'System', count: `${data ? data.effects.filter((e) => e.k === 'spawns').length : 0} spawns` },
    { id: 'L2', name: 'Packages', count: `${data ? data.packages.length : 0} crates` },
    { id: 'L3', name: 'Files', count: (data ? data.files.length : 0).toLocaleString() },
    { id: 'L4', name: 'Types', count: (data ? data.totals.types : 0).toLocaleString() },
    { id: 'L5', name: 'Functions', count: (data ? data.totals.functions : 0).toLocaleString() },
  ];

  const scopeBar = data && (pkg || file) ? <Scope view={view} onGo={go} /> : null;

  return (
    /* The report's own face. `body` is monospace for the front page, where a
       terminal is the point; a page of prose about somebody's codebase is read
       rather than typed, so it takes the display face and the parts that are
       actually code ask for mono. */
    <div className="font-display text-[15px] leading-[1.55]">
      <Search
        data={data}
        open={searching}
        onClose={() => setSearching(false)}
        onGo={go}
      />
      {/* Stays, so the fixed column beneath it can be pinned to a known
          offset rather than to wherever the page happens to be scrolled. */}
      <Header
        catalog={catalog}
        source={source}
        data={data}
        onGo={go}
        onSearch={() => setSearching(true)}
      />

      <div className="mx-auto block max-w-[calc(var(--rail)+var(--report))] pb-[60px] pl-0 pr-5 pt-[22px] side:pl-[var(--rail)]">
        {/* Fixed and scrolled on its own from `side` up; a strip in the flow
            below it, because a fixed column on a phone covers the report. */}
        <div className="mb-3 flex flex-col gap-3 side:fixed side:bottom-0 side:left-[max(10px,calc(50%-(var(--rail)+var(--report))/2+10px))] side:top-[var(--head)] side:mb-0 side:w-[calc(var(--rail)-26px)] side:gap-[18px] side:overflow-y-auto side:overscroll-contain side:pb-6 side:pt-[22px] side:[scrollbar-color:transparent_transparent] side:[scrollbar-width:thin] side:hover:[scrollbar-color:var(--color-rule)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-content [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-rule">
          <ElevationRail levels={levels} current={level} onSelect={(id) => go({ level: id })} />
          {/* Empty slots read as "still arriving". Nothing is arriving for a
              repository that has no timeline to fetch, so the rail goes with
              the elevations rather than sitting there pretending. */}
          <TimeMachine
            commits={timeline}
            releases={error ? [] : releaseList}
            releasesTrouble={releaseTrouble}
            trouble={timelineTrouble}
            // Only as many as there are. An empty slot means "still arriving",
            // and nothing is arriving for a commit nobody has heard of.
            slots={error ? 0 : Math.min(policy.commits, Math.max(timeline.length, 1))}
            active={ref}
            tab={effectiveTab}
            onTabChange={setTab}
            // Only the commit. Stepping back while reading the functions of a
            // crate should show that crate's functions a commit earlier —
            // being returned to the score each time is what makes comparing
            // two commits impossible.
            onSelectCommit={(i) => go({ ref: timeline[i]?.short ?? null })}
            onSelectRelease={(release) => go({ ref: release.sha?.slice(0, 8) ?? null })}
          />
        </div>

        {/* Fills what it is given, and stretches to the window while there is
            nothing in it yet — otherwise the colophon rides up under a loading
            box and sits in the middle of an empty screen. */}
        <main
          ref={main}
          className="flex min-h-[calc(100vh-var(--head)-104px)] max-w-[980px] flex-col wide:max-w-none"
          style={held && !data ? { minHeight: held } : undefined}
        >
          {error ? (
            <div className={EMPTY}>{error}</div>
          ) : !source ? (
            <div className={EMPTY}>
              Nothing to open. This deployment lists no repository, so name one
              in the address — <code>/{'{owner}'}/{'{repo}'}</code>.
            </div>
          ) : !data ? (
            stage ? (
              <Analysing repo={source} at={at} stage={stage} />
            ) : (
              <div className={EMPTY}>Loading {source}{at ? ` at ${at}` : ''}…</div>
            )
          ) : (
            // A report is up. Whatever is coming replaces it when it arrives,
            // in place — the page does not empty itself to fetch its successor.
            // A report being replaced stays legible and stays exactly where it
            // is: dimming says it is last commit's, and moving it is what made
            // every click flash.
            <div className={stage ? '[&>*:not([role=status])]:opacity-45 [&>*]:transition-opacity' : undefined}>
              {stage ? <Working at={at} stage={stage} /> : null}
              {level !== 'L0' && level !== 'L1' && level !== 'L2' ? scopeBar : null}
              <LevelView
                level={level}
                data={data}
                timeline={timeline}
                viewing={commit}
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

          <footer className="mt-auto flex flex-wrap items-center justify-center gap-[18px] border-t border-rule-soft pb-2 pt-[18px] font-mono text-[12px] text-ink-faint [&_a]:text-accent [&_a:hover]:underline">
                powered by{' '}
                <a
                  className="font-mono text-[17px] font-bold tracking-[-0.02em] !text-ink"
                  href="https://github.com/samifouad/cqx"
                  target="_blank"
                  rel="noopener"
                >
                  cqx
                </a>
                {' '}by{' '}
                <a href="https://samifou.ad" target="_blank" rel="noopener">Sami Fouad</a>
                <ThemePicker />
              </footer>
        </main>
      </div>
    </div>
  );
}
