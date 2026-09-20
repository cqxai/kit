/**
 * No `'use client'`. Facts and dials, both of which a server can draw — see
 * the note in Cover for why that matters and why it must keep working in a
 * client tree too.
 */
import type { Analysis, Commit, Dataset, Package, RepoMeta, View } from '../../engine/index.js';
import { Score } from '../Score.js';
import { Bar, DialSkeleton } from './Skeleton.js';


/**
 * Milliseconds as seconds, to one place — except below a tenth, where one
 * place would round a real measurement down to nothing.
 */
const seconds = (ms: number): string => (ms / 1000).toFixed(ms < 100 ? 2 : 1);

const spent = (a: Analysis): string =>
  typeof a.ms === 'number' ? seconds(a.ms + (a.fetch ?? 0)) : '0.0';

const breakdown = (a: Analysis): string =>
  [
    a.fetch ? `${seconds(a.fetch)}s fetching` : null,
    typeof a.ms === 'number'
      ? `${seconds(a.ms)}s analysing${(a.readers ?? 1) > 1 ? ` across ${a.readers} threads` : ''}`
      : null,
    a.held ? `${Math.round(a.held / 1e6).toLocaleString()} MB per reader` : null,
    a.cqx ? `cqx ${a.cqx}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

/** A titled box on the left column. */
function Box({
  title,
  note,
  action,
  children,
}: {
  title: string;
  note?: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <section className="mb-3 rounded-[3px] border border-rule bg-panel">
      <h2 className="m-0 flex items-baseline gap-2 border-b border-rule-soft px-3 py-2 font-display text-[12.5px] font-semibold text-ink-soft">
        {title}
        {note ? <span className="font-normal text-ink-faint">{note}</span> : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="ml-auto cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[12px] font-normal text-accent hover:underline"
          >
            {action.label}
          </button>
        ) : null}
      </h2>
      <div className="px-3 py-2.5">{children}</div>
    </section>
  );
}

/** One line of the About box: a glyph, then the fact. */
function Fact({ glyph, children }: { glyph: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2.5 border-b border-rule-soft py-[7px] text-[12.5px] last:border-b-0 [&_b]:font-semibold [&_b]:text-ink">
      <i className="w-3.5 shrink-0 text-center not-italic text-ink-faint">{glyph}</i>
      <div className="min-w-0 text-ink-soft">{children}</div>
    </div>
  );
}

/** A small square, for a dependency or a person. */
function Tile({ label, src, initials }: { label: string; src?: string; initials?: string }) {
  return (
    <span className="flex w-[68px] flex-col items-center gap-1 text-center">
      <span className="grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-[3px] border border-rule bg-ground font-mono text-[13px] text-ink-faint">
        {src ? <img className="h-full w-full object-cover" src={src} alt="" /> : initials}
      </span>
      <span className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ink-soft">
        {label}
      </span>
    </span>
  );
}

/**
 * The left column: what is true of this repository, rather than what happened
 * to it.
 *
 * It opens by saying what the page is. A generated profile of somebody else's
 * project that does not say so is a page pretending to be official, and the
 * first thing a reader deserves to know is who is talking.
 */
export function Side({
  repo,
  meta,
  data,
  size,
  scores: known,
  at,
  commit,
  packages,
  contributors,
  waiting,
  onGo,
}: {
  repo: string;
  /** Partial for the same reason as the cover's — see the note there. */
  meta: Partial<RepoMeta> | null;
  data: Dataset | null;
  /**
   * What was read, when something has read it. Passed in rather than counted
   * off the dataset so that a server which knows the three numbers — and has
   * no dataset — can say them too.
   */
  size?: { crates: number; files: number; lines: number } | null;
  /**
   * The scores a server already knew, drawn until the dataset arrives with
   * the same numbers and the deltas that go under them.
   */
  scores?: Record<string, number> | null;
  at: string | null;
  commit: Commit | null;
  packages: Package[];
  contributors: string[];
  /** Nothing has arrived yet, so nothing may be asserted about it. */
  waiting: boolean;
  onGo: (patch: Partial<View>) => void;
}) {
  // The dataset wins when it is here: it is the same measurement, and it
  // carries the deltas the server's copy does not.
  const scores = Object.entries(data ? data.score.scores : (known ?? {}));
  const biggest = [...packages].sort((a, b) => b.lines - a.lines).slice(0, 6);

  return (
    <div>
      {/* A fixed height across both states. The skeleton rings and the real
          dials are not the same size — the dials carry a delta under them —
          so the box grew by 62px when the dataset landed and took the whole
          left column with it. Reserved rather than matched, because the
          delta is only there on some commits. */}
      <Box title="CodeQuality Score" note={at ? `at ${at}` : undefined}>
        {/* Three across, not however many fit. Five categories in a 340px
            column wrap four-then-one, which reads as one of them having been
            singled out. */}
        <div className="grid min-h-[196px] grid-cols-3 content-start justify-items-center gap-y-2">
          {/* Rings, not a sentence. "Not scored at this commit" was being said
              for the two seconds before the dataset arrived, which is a claim
              about the repository made before anything was known about it. */}
          {scores.length === 0 ? (
            waiting ? (
              [0, 1, 2, 3, 4].map((i) => <DialSkeleton key={i} />)
            ) : (
              <p className="col-span-3 m-0 py-3 text-[12.5px] text-ink-faint">
                Not scored at this commit.
              </p>
            )
          ) : (
            scores.map(([key, value]) => (
              <Score
                key={key}
                title={key}
                score={value}
                delta={commit?.delta?.[key] ?? null}
                since={commit?.delta?.[key] ? 'the last scored commit' : null}
              />
            ))
          )}
        </div>
      </Box>

      <Box title="About">
        <Fact glyph="ⓘ">
          <span className="text-ink-faint">
            This page is not affiliated with the project and is generated automatically from git
            history.
          </span>
        </Fact>
        {waiting && !meta ? (
          <>
            <Fact glyph="◆"><Bar w="58%" h={9} /></Fact>
            <Fact glyph="§"><Bar w="40%" h={9} /></Fact>
            <Fact glyph="◷"><Bar w="72%" h={9} /></Fact>
          </>
        ) : null}
        {meta?.language ? (
          <Fact glyph="◆">
            Written in <b>{meta.language}</b>
          </Fact>
        ) : null}
        {meta?.license ? (
          <Fact glyph="§">
            Licensed <b>{meta.license}</b>
          </Fact>
        ) : null}
        {/* Only once GitHub has answered. A server knows a description and a
            licence; the age and the following are not in our database and a
            half-drawn fact reads worse than a missing one. */}
        {meta?.created !== undefined && meta.stars !== undefined ? (
          <Fact glyph="◷">
            Started{' '}
            <b>
              {new Date(meta.created).toLocaleDateString(undefined, {
                month: 'long',
                year: 'numeric',
              })}
            </b>{' '}
            · {meta.stars.toLocaleString()} {meta.stars === 1 ? 'star' : 'stars'}
          </Fact>
        ) : null}
        {waiting && !size ? <Fact glyph="≡"><Bar w="66%" h={9} /></Fact> : null}
        {size ? (
          <Fact glyph="≡">
            <b>{size.crates.toLocaleString()} crates</b> ·{' '}
            {size.files.toLocaleString()} files · {size.lines.toLocaleString()} lines
          </Fact>
        ) : null}
        {/* Where the reading came from and what it cost. The report says this
            in its header; here there is a cover in the way, and this is where
            a reader looks for provenance anyway.

            The whole wait, not the parse. Nothing can be analysed before it
            has been read, and reporting only the analysis tells a reader they
            waited a third of what they did — a dataset that came from the
            store carries no fetch of its own, which is why the published
            repositories are quick. The split is on the hover. */}
        <Fact glyph="⟳">
          <span data-cqx="analysis">
            Read at{' '}
            <a
              className="text-accent hover:underline"
              href={`https://github.com/${repo}${at ? `/commit/${at}` : ''}`}
              target="_blank"
              rel="noopener"
            >
              {at ?? 'head'}
            </a>
            {data?.analysis ? (
              <>
                {' · analyzed in '}
                <b title={breakdown(data.analysis)}>{spent(data.analysis)}</b>s
              </>
            ) : null}
          </span>
        </Fact>
      </Box>

      {biggest.length > 0 ? (
        <Box
          title="Crates"
          note={`${packages.length}`}
          action={{ label: 'See all', onClick: () => onGo({ level: 'L2' }) }}
        >
          <div className="flex flex-wrap gap-2">
            {biggest.map((p) => (
              <Tile key={p.id} label={p.name} initials={p.name.slice(0, 2)} />
            ))}
          </div>
        </Box>
      ) : null}

      {contributors.length > 0 ? (
        <Box title="Contributors" note={`${contributors.length} recently`}>
          <div className="flex flex-wrap gap-2">
            {contributors.slice(0, 6).map((name) => (
              <Tile key={name} label={name} initials={name.slice(0, 2).toLowerCase()} />
            ))}
          </div>
          <p className="m-0 mt-2.5 text-[11.5px] text-ink-faint">
            Everyone here is someone git history mentioned. A check will mean a person registered
            with cqx who approved the use of their photograph.
          </p>
        </Box>
      ) : null}
    </div>
  );
}
