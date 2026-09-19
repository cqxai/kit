import type { Commit } from '../engine/index.js';

/**
 * A slot on the rail. Compact where the elevations are roomy: this list is
 * twenty long and the elevations are six.
 *
 * On a phone it reads across, like the elevations above it; from `side` up it
 * is a column. The marker follows — a bottom edge under a strip, a left edge
 * beside a column.
 */
const SLOT = [
  'grid shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap',
  'grid-cols-[18px_1fr] border-0 bg-transparent px-2 py-1 text-left leading-tight text-ink-soft',
  'border-b-2 border-rule-soft side:border-b-0 side:border-l-2',
  'hover:bg-rule-soft hover:text-ink',
  'aria-[current=true]:border-button aria-[current=true]:bg-rule-soft aria-[current=true]:text-ink',
].join(' ');

/** Shown, honestly, but not a working button. */
const UNRESOLVED = 'cursor-default opacity-55';

const KIND = 'text-[9.5px] font-semibold text-ink-faint group-aria-[current=true]:text-accent';
const NAME = 'font-mono text-[14px] font-semibold tracking-[-0.02em]';
const WHEN = 'text-[9.5px] tracking-normal text-ink-faint';

/** Why the rail is short, when it is short for a reason. */
const NOTE = 'max-w-[184px] px-2 pt-[5px] font-mono text-[9.5px] leading-[1.35] text-ink-faint';

/** A slot whose contents have not arrived. Zero would say "none". */
const GHOST =
  'inline-block min-w-[66px] rounded-[3px] bg-rule-soft text-transparent animate-pulse-soft motion-reduce:animate-none motion-reduce:opacity-60';
import type { ReleaseRef } from '../engine/index.js';

const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.valueOf())
    ? ''
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export type TimeMachineTab = 'releases' | 'commits';

/**
 * Which snapshot is being looked at, and which list it is being chosen from.
 *
 * Releases are the default view: a tag is a deliberate moment, and toggling
 * scores between two of them — rather than between two commits a minute
 * apart — is the comparison that actually shows something. Commits are the
 * fallback every repository has, tagged or not.
 *
 * L0 is head and each step down is a commit further back. Scoring one means
 * fetching and extracting it, so a slot that has not arrived says so rather
 * than the rail withholding itself until the last one lands.
 */
export function TimeMachine({
  commits,
  releases,
  releasesTrouble,
  trouble,
  slots,
  active,
  tab,
  onTabChange,
  onSelectCommit,
  onSelectRelease,
}: {
  commits: Commit[];
  /** Null while the list is still being asked for. */
  releases: ReleaseRef[] | null;
  /** Why the release list is empty, when it is empty for a reason. */
  releasesTrouble?: string;
  /** Why the rail has nothing to show, when that is not the repository's fault. */
  trouble?: string | null;
  slots: number;
  /** The short sha currently addressed, however this view was reached. */
  active: string | null;
  tab: TimeMachineTab;
  onTabChange: (tab: TimeMachineTab) => void;
  onSelectCommit: (index: number) => void;
  onSelectRelease: (release: ReleaseRef) => void;
}) {
  const showingReleases = tab === 'releases';

  return (
    <nav className="flex shrink-0 flex-col">
      <h3>Time machine</h3>
      <div className="mb-1.5 ml-0.5 flex shrink-0 gap-0.5" role="tablist" aria-label="Time machine source">
        <button
          type="button"
          role="tab"
          aria-selected={showingReleases}
          className="cursor-pointer border-0 border-b-2 border-rule-soft bg-transparent px-0.5 pb-[5px] pt-[3px] font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint hover:text-ink aria-[selected=true]:border-button aria-[selected=true]:text-accent"
          onClick={() => onTabChange('releases')}
        >
          releases
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!showingReleases}
          className="cursor-pointer border-0 border-b-2 border-rule-soft bg-transparent px-0.5 pb-[5px] pt-[3px] font-mono text-[10px] uppercase tracking-[0.06em] text-ink-faint hover:text-ink aria-[selected=true]:border-button aria-[selected=true]:text-accent"
          onClick={() => onTabChange('commits')}
        >
          commits
        </button>
      </div>

      <div className="flex flex-row gap-1.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden side:flex-col side:gap-px side:overflow-visible side:pb-0">
        {showingReleases ? (
          releases === null ? (
            <div className={NOTE}>loading releases…</div>
          ) : releases.length === 0 ? (
            // Empty for a reason and empty because there are none are different
            // things, and only one of them is about the repository.
            <div className={NOTE}>{releasesTrouble ?? 'no releases published.'}</div>
          ) : (
            releases.map((r) => (
              <button
                key={r.tag}
                className={`group ${SLOT}`}
                aria-current={!!r.sha && !!active && r.sha.startsWith(active)}
                disabled={!r.sha}
                onClick={() => r.sha && onSelectRelease(r)}
                title={r.name}
              >
                <span className={KIND}>tag</span>
                <span>
                  <span className={NAME}>{r.tag}</span>
                  <br />
                  <span className={WHEN}>{when(r.publishedAt)}</span>
                </span>
              </button>
            ))
          )
        ) : (
          <>
            {Array.from({ length: slots }, (_, i) => {
              const commit = commits[i];
              if (!commit) {
                return (
                  <button key={i} className={`group ${SLOT} cursor-default`} disabled>
                    <span className={KIND}>L{i}</span>
                    <span>
                      <span className={`${NAME} ${GHOST}`}>········</span>
                      <br />
                      <span className={`${WHEN} ${GHOST} h-[9px] min-w-[44px]`}>·····</span>
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={commit.sha}
                  className={`group ${SLOT}`}
                  aria-current={commit.short === active}
                  onClick={() => onSelectCommit(i)}
                  title={commit.subject}
                >
                  <span className={KIND}>L{i}</span>
                  <span>
                    <span className={NAME}>{commit.short}</span>
                    <br />
                    <span className={WHEN}>{when(commit.date)}</span>
                  </span>
                </button>
              );
            })}
            {commits.length < slots ? (
              <div className={NOTE}>{trouble ?? `scoring ${slots} commits…`}</div>
            ) : null}
          </>
        )}
      </div>
    </nav>
  );
}
