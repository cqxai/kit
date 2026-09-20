'use client';

import type { Brand, Catalog, Dataset, View } from '../engine/index.js';
import { RepoInput } from './RepoInput.js';
import { SearchButton } from './Search.js';

/** Whoever's deployment this is, signing its own header. */
const BRAND = 'inline-flex items-center gap-2 text-[20px] font-semibold tracking-[-0.02em] text-ink no-underline [&_img]:rounded-full';

/**
 * Milliseconds as seconds, to one place — except below a tenth, where one
 * place would round a real measurement down to nothing.
 */
const seconds = (ms: number): string => (ms / 1000).toFixed(ms < 100 ? 2 : 1);

/**
 * The deployment's own mark. The name carries it only when there is no image —
 * a mark and its wordmark beside each other says the same thing twice.
 *
 * A mark pointing somewhere in this deployment is routed rather than followed:
 * reloading the page to reach a view the page can already render costs a
 * second for nothing. It stays a real link, so opening it in a tab still
 * works — only a plain click is taken over.
 */
function BrandMark({ brand, onHome }: { brand: Brand; onHome: (() => void) | null }) {
  const inner = brand.icon ? (
    <img src={brand.icon} alt={brand.name} width={30} height={30} />
  ) : (
    brand.name
  );
  if (!brand.href) return <span className={BRAND} title={brand.name}>{inner}</span>;
  // Routed only when there is something here to route to. A local href used
  // to be proof of that, back when the explorer was the whole deployment and
  // `/` could only mean a repository. On a site whose front page is somebody
  // else's — cqx.bio's is marketing — `/` is a different page and taking the
  // click over just moved the reader nowhere.
  const routed = onHome !== null && brand.href.startsWith('/');
  return (
    <a
      className={BRAND}
      href={brand.href}
      title={brand.name}
      onClick={(e) => {
        if (!routed || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onHome();
      }}
    >
      {inner}
    </a>
  );
}


/**
 * The bar across the top, on whichever shell is under it.
 *
 * It is the same bar on the report and on the profile deliberately. Where you
 * are in cqx, what you are looking at and how to open something else are not
 * things worth re-learning one page in — and the two shells disagree about
 * enough below it already.
 */
export function Header({
  catalog,
  source,
  data,
  onGo,
  onSearch,
}: {
  catalog: Catalog | null;
  source: string;
  data: Dataset | null;
  onGo: (patch: Partial<View>) => void;
  onSearch: () => void;
}) {
  return (
    <header className="border-b border-rule side:sticky side:top-0 side:z-20 side:bg-ground">
      <div className="mx-auto flex max-w-none flex-wrap items-center gap-3.5 py-3.5 pl-2.5 pr-5">
        {/* Whose deployment this is, if it said. The mark is deka's on
            explorer.deka.gg and absent on a directory somebody exported of
            their own repository — which is the whole reason it is declared
            rather than built in. */}
        {catalog?.brand ? (
          <BrandMark
            brand={catalog.brand}
            onHome={
              catalog.default
                ? () =>
                    onGo({
                      repo: catalog.default as string,
                      ref: null,
                      pkg: null,
                      file: null,
                      level: 'L0',
                    })
                : null
            }
          />
        ) : (
          <span className={`${BRAND} font-mono font-bold`}>cqx</span>
        )}
        <RepoInput
          value={source}
          suggestions={catalog?.entries.map((e) => e.repo) ?? []}
          onOpen={(repo) => onGo({ repo, pkg: null, file: null, ref: null, level: 'L0' })}
        />
        {/* Only once there is something to search. An empty palette over an
            empty page is chrome pretending to be a feature. */}
        {data ? <SearchButton onOpen={onSearch} /> : null}
        {/* Always present, so the top of the page does not appear and
            disappear on every click. Zero is what is known so far. */}
        {/* Right-aligned and reserved: the numbers change width as they are
            learned, and without a floor the whole line slides. */}
        <span data-cqx="totals" className="ml-auto text-right font-mono text-[12px] tabular-nums text-ink-faint side:min-w-[34ch] [&_b]:font-semibold [&_b]:text-ink">
          <b>{(data?.totals.nodes ?? 0).toLocaleString()}</b> nodes ·{' '}
          <b>{(data?.totals.edges ?? 0).toLocaleString()}</b> edges ·{' '}
          <b>{(data?.totals.lines ?? 0).toLocaleString()}</b> lines
          {/* One number, and it is the whole wait. Nothing can be parsed
              before it has been read, so reporting only the parse tells a
              reader they waited a third of what they did. A dataset from the
              store carries no fetch of its own — the reading happened in CI,
              which is why the published repositories are quick. The split is
              on the hover. */}
          {' · analyzed in '}
          <b
            title={
              data?.analysis
                ? [
                    data.analysis.fetch ? `${seconds(data.analysis.fetch)}s fetching` : null,
                    typeof data.analysis.ms === 'number'
                      ? `${seconds(data.analysis.ms)}s analysing${
                          (data.analysis.readers ?? 1) > 1
                            ? ` across ${data.analysis.readers} threads`
                            : ''
                        }`
                      : null,
                    data.analysis.held
                      ? `${Math.round(data.analysis.held / 1e6).toLocaleString()} MB per reader`
                      : null,
                    data.analysis.cqx ? `cqx ${data.analysis.cqx}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : undefined
            }
          >
            {typeof data?.analysis?.ms === 'number'
              ? seconds(data.analysis.ms + (data.analysis.fetch ?? 0))
              : '0.0'}
          </b>
          s
        </span>
      </div>
    </header>
  );
}
