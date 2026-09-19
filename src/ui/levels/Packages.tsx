import { Suspense, lazy, useEffect, useMemo, useState } from 'react';

import type { Package } from '../../engine/index.js';
import { edgeId, freshPackages, loadDataset, packageEdges } from '../../engine/index.js';

import { EffectBadges } from '../EffectBadges.js';
import { BAR, BAR_FILL, CARD, CARD_GRID, CARD_META, CARD_NAME, H2, LEDE } from '../classes.js';
import type { GraphEdge, GraphNode } from '../Graph.js';

/**
 * The graph is loaded when somebody asks for it and not before.
 *
 * It brings a force-layout engine with it, and most readers of a report never
 * open it. Putting it in the bundle everybody downloads would make the
 * elevation they did want slower to reach.
 */
const Graph = lazy(() => import('../Graph.js').then((m) => ({ default: m.Graph })));

type Tab = 'grid' | 'graph';

const TAB =
  'rounded-[6px] border px-2.5 py-[3px] font-mono text-[11.5px] cursor-pointer bg-transparent';
const TAB_ON = 'border-button bg-rule-soft text-ink';
const TAB_OFF = 'border-rule-soft text-ink-soft hover:border-button';

export function PackagesLevel({
  packages,
  repo,
  previous,
  onSelect,
}: {
  packages: Package[];
  /** `owner/name`, so the graph can ask what the previous commit held. */
  repo?: string | null;
  /** The commit before the one on screen, if the rail knows of one. */
  previous?: string | null;
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('grid');
  const largest = Math.max(...packages.map((p) => p.lines), 1);

  return (
    <div>
      <div className="mb-[3px] flex flex-wrap items-baseline gap-3">
        <h2 className={`${H2} mb-0`}>{packages.length} crates</h2>
        <div className="ml-auto flex gap-1.5" role="tablist">
          {(['grid', 'graph'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`${TAB} ${tab === t ? TAB_ON : TAB_OFF}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <p className={LEDE}>
        {tab === 'grid'
          ? 'Sized by lines, badged by what each reaches. Selecting one scopes every elevation below.'
          : 'Which crate draws on which. Drag a node to arrange it, drag the background to pan, and the gear tunes the physics.'}
      </p>

      {tab === 'graph' ? (
        <Suspense
          fallback={
            <div className="rounded-lg border border-rule-soft bg-panel px-[18px] py-[38px] text-center font-mono text-[12px] text-ink-faint">
              drawing the graph…
            </div>
          }
        >
          <PackageGraph packages={packages} repo={repo} previous={previous} onSelect={onSelect} />
        </Suspense>
      ) : (
        <div className={CARD_GRID}>
          {[...packages].sort((a, b) => b.lines - a.lines).map((p) => (
            <button className={CARD} key={p.id} onClick={() => onSelect(p.id)}>
              <span className={CARD_NAME}>{p.name}</span>
              <span className={CARD_META}>
                <span>{p.files.toLocaleString()} files</span>
                <span>{p.lines.toLocaleString()} lines</span>
              </span>
              <span className={BAR}>
                <i
                  className={BAR_FILL}
                  style={{ width: `${Math.max(3, Math.round((p.lines / largest) * 100))}%` }}
                />
              </span>
              <EffectBadges effects={p.eff} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Crates and what they draw on.
 *
 * A package's `deps` are *names*, not ids — that is what a manifest says —
 * so an edge exists where a dependency's name is also a crate in this
 * workspace. The rest are external, and are counted on the node rather than
 * drawn: a graph of every crate on crates.io that this repository touches is
 * a different picture, and a much less useful one.
 */
function PackageGraph({
  packages,
  repo,
  previous,
  onSelect,
}: {
  packages: Package[];
  repo?: string | null;
  previous?: string | null;
  onSelect: (id: string) => void;
}) {
  const [before, setBefore] = useState<Package[] | null>(null);
  const [asked, setAsked] = useState(false);

  // The previous commit, fetched only once somebody is looking at the graph.
  // Without it the picture is still correct; it just cannot say what is new.
  useEffect(() => {
    if (!repo || !previous) return;
    let live = true;
    loadDataset(repo, previous)
      .then((dataset) => {
        if (live) setBefore(dataset?.packages ?? null);
      })
      .finally(() => {
        if (live) setAsked(true);
      });
    return () => {
      live = false;
    };
  }, [repo, previous]);

  const { nodes, edges, fresh } = useMemo(() => {
    const largest = Math.max(...packages.map((p) => p.lines), 1);

    const nodes: GraphNode[] = packages.map((p) => ({
      id: p.id,
      label: p.name,
      kind: 'crate',
      weight: p.lines / largest,
      meta:
        `${p.files.toLocaleString()} files · ${p.lines.toLocaleString()} lines` +
        (p.ext ? ` · ${p.ext} external ${p.ext === 1 ? 'dependency' : 'dependencies'}` : '') +
        (p.bins.length ? `\nbinaries: ${p.bins.join(', ')}` : ''),
    }));

    const edges: GraphEdge[] = packageEdges(packages).map((e) => ({
      id: edgeId(e.from.id, e.to.id),
      from: e.from.id,
      to: e.to.id,
      type: 'depends_on',
    }));

    return { nodes, edges, fresh: freshPackages(packages, before).all };
  }, [packages, before]);

  return (
    <Graph
      nodes={nodes}
      edges={edges}
      fresh={before ? fresh : undefined}
      since={before && previous ? previous : null}
      empty="No crates to draw."
      onSelect={onSelect}
    />
  );
}
