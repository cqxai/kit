import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from 'd3-force';

/**
 * The graph, drawn.
 *
 * A score says how much; a graph says on what. This is the same live force
 * layout zega's own console uses — nodes settle continuously and re-heat when
 * dragged — because that is the interaction people already know from neo4j
 * and there is no reason to invent a second one.
 *
 * ## Why the drawing is imperative
 *
 * The simulation mutates every node's `x` and `y` sixty times a second. Going
 * through React for that would reconcile the whole graph on every frame to
 * change two numbers per node. So React owns the elements and the layout owns
 * their positions: the effect below creates the SVG once and moves it by hand
 * thereafter. Nothing outside this file can tell.
 *
 * ## What is new
 *
 * The one thing a reader of a *commit* wants that a reader of a repository
 * does not is which of this was not here before. `fresh` names those nodes
 * and edges and they are drawn in the warning colour with the legend above
 * saying what they are new since — so the answer is on the picture rather
 * than in a diff somewhere else.
 */

export interface GraphNode {
  id: string;
  /** What to write under it. */
  label: string;
  /** Which kind of thing it is — decides the colour. */
  kind?: string;
  /** A line for the tooltip. */
  meta?: string;
  /** Relative importance, 0..1, nudges the radius. */
  weight?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  /** The relationship, as the schema spells it: `depends_on`, `calls`. */
  type: string;
}

/** A node the simulation has taken ownership of. */
interface Placed extends GraphNode {
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

const NS = 'http://www.w3.org/2000/svg';
const BOX = { w: 900, h: 560 };
const R = 22;

/**
 * The sliders, and what they mean. Kept to the four zega's console offers,
 * with the same names, so somebody who has tuned one graph knows this one.
 */
const PHYSICS_KEY = 'cqx.graph.physics';
const PHYSICS: {
  key: keyof Physics;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
}[] = [
  { key: 'repulsion', label: 'Repulsion', min: 25, max: 300, step: 5, unit: '%' },
  { key: 'linkDist', label: 'Link distance', min: 40, max: 300, step: 5 },
  { key: 'pad', label: 'Node padding', min: 0, max: 40, step: 1 },
  { key: 'gravity', label: 'Center pull', min: 0, max: 12, step: 1, unit: '%' },
];

interface Physics {
  repulsion: number;
  linkDist: number;
  pad: number;
  gravity: number;
}

/**
 * `gravity` is not zero, unlike zega's console.
 *
 * A workspace almost always contains a crate nothing depends on and which
 * depends on nothing. `forceCenter` only recentres the average; it does not
 * pull. So an unconnected node felt the charge and nothing else, drifted
 * until it stopped, and dragged the bounding box with it — which framed the
 * whole graph as a thumbnail in the corner of an empty canvas. A gentle pull
 * keeps the strays in the picture, and the slider still goes to zero.
 */
const DEFAULTS: Physics = { repulsion: 100, linkDist: 105, pad: 10, gravity: 5 };

function remembered(): Physics {
  if (typeof localStorage === 'undefined') return { ...DEFAULTS };
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PHYSICS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function Graph({
  nodes,
  edges,
  fresh,
  since,
  empty = 'Nothing to draw here.',
  onSelect,
  className = '',
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Ids — of nodes and of edges — that did not exist at the previous commit. */
  fresh?: ReadonlySet<string>;
  /** What they are new since. Drawn in the legend; absent means no legend. */
  since?: string | null;
  empty?: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const [physics, setPhysics] = useState<Physics>(remembered);
  const [open, setOpen] = useState(false);
  const sim = useRef<Simulation<Placed, undefined> | null>(null);
  const tune = useRef<((p: Physics) => void) | null>(null);

  // A stable identity for the data, so the simulation is not torn down and
  // rebuilt by a parent that re-rendered for an unrelated reason.
  const shape = useMemo(
    () => nodes.map((n) => n.id).join('|') + '§' + edges.map((e) => e.id).join('|'),
    [nodes, edges],
  );

  useEffect(() => {
    const box = host.current;
    if (!box || nodes.length === 0) return;
    const cleanup = draw(box, nodes, edges, fresh, physicsRef.current, onSelect, sim, tune);
    return cleanup;
    // `physics` deliberately absent: changing a slider tunes the running
    // simulation rather than rebuilding it, which is what makes it feel live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, fresh]);

  // The panel edits an object the effect closed over, so the current value has
  // to be readable without re-running the effect.
  const physicsRef = useRef(physics);
  physicsRef.current = physics;

  const change = (key: keyof Physics, value: number) => {
    const next = { ...physicsRef.current, [key]: value };
    physicsRef.current = next;
    setPhysics(next);
    tune.current?.(next);
    try {
      localStorage.setItem(PHYSICS_KEY, JSON.stringify(next));
    } catch {
      // A browser that refuses storage still gets a working graph; it just
      // forgets the settings.
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-rule px-[18px] py-[38px] text-center text-ink-soft">
        {empty}
      </div>
    );
  }

  const newCount = fresh ? nodes.filter((n) => fresh.has(n.id)).length : 0;
  const newEdges = fresh ? edges.filter((e) => fresh.has(e.id)).length : 0;

  return (
    <div className={className}>
      {since ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <i className="inline-block size-2.5 rounded-[3px] bg-yellow" />
            new for {since}
          </span>
          <span>
            {newCount} {newCount === 1 ? 'node' : 'nodes'} · {newEdges}{' '}
            {newEdges === 1 ? 'edge' : 'edges'}
          </span>
          <span className="ml-auto">{nodes.length} nodes · {edges.length} edges</span>
        </div>
      ) : (
        <div className="mb-2 text-right font-mono text-[11px] text-ink-faint">
          {nodes.length} nodes · {edges.length} edges
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg border border-rule-soft bg-panel">
        <div ref={host} className="h-[560px] w-full [&_svg]:block [&_svg]:size-full" />

        <button
          type="button"
          aria-expanded={open}
          title="Layout settings"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2.5 top-2.5 rounded-[6px] border border-rule-soft bg-ground px-2 py-1 text-[13px] leading-none text-ink-soft hover:border-button"
        >
          ⚙
        </button>

        {open ? (
          <div className="absolute right-2.5 top-11 z-10 w-[260px] rounded-lg border border-rule bg-ground p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            {PHYSICS.map((p) => (
              <label key={p.key} className="mb-2 flex items-center gap-2 text-[11.5px] text-ink-soft">
                <span className="w-[88px] shrink-0">{p.label}</span>
                <input
                  type="range"
                  className="w-full accent-[var(--color-button)]"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={physics[p.key]}
                  onChange={(e) => change(p.key, Number(e.target.value))}
                />
                <b className="w-[42px] shrink-0 text-right font-mono text-[11px] tabular-nums text-ink">
                  {physics[p.key]}
                  {p.unit ?? ''}
                </b>
              </label>
            ))}
            <button
              type="button"
              className="mt-1 w-full rounded-[5px] border border-rule-soft px-2 py-1 font-mono text-[11px] text-ink-soft hover:border-button"
              onClick={() => {
                physicsRef.current = { ...DEFAULTS };
                setPhysics({ ...DEFAULTS });
                tune.current?.({ ...DEFAULTS });
                try {
                  localStorage.removeItem(PHYSICS_KEY);
                } catch {
                  /* nothing to forget */
                }
              }}
            >
              reset
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Builds the SVG once and moves it by hand thereafter.
 *
 * Returns the teardown. Everything it creates is inside `box`, so a caller
 * that empties `box` has undone all of it — but the simulation is a timer and
 * has to be stopped, or a graph that has been navigated away from goes on
 * burning a frame budget nobody is watching.
 */
function draw(
  box: HTMLDivElement,
  nodes: GraphNode[],
  edges: GraphEdge[],
  fresh: ReadonlySet<string> | undefined,
  physics: Physics,
  onSelect: ((id: string) => void) | undefined,
  simRef: { current: Simulation<Placed, undefined> | null },
  tuneRef: { current: ((p: Physics) => void) | null },
): () => void {
  const placed: Placed[] = nodes.map((n) => ({ ...n, x: 0, y: 0 }));
  const byId = new Map(placed.map((n) => [n.id, n]));
  // An edge pointing at something that is not here cannot be drawn, and a
  // link force handed one throws rather than ignoring it.
  const drawn = edges.filter((e) => byId.has(e.from) && byId.has(e.to));

  box.innerHTML = '';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${BOX.w} ${BOX.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.touchAction = 'none';
  svg.innerHTML =
    `<defs>` +
    `<marker id="cqx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-ink-faint)"/></marker>` +
    `<marker id="cqx-arrow-new" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-yellow)"/></marker>` +
    `</defs><g class="viewport"></g>`;
  box.appendChild(svg);

  const tip = document.createElement('div');
  tip.style.cssText =
    'position:absolute;display:none;pointer-events:none;z-index:20;max-width:320px;white-space:pre-wrap;' +
    'border-radius:6px;padding:6px 8px;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'background:var(--color-ground);color:var(--color-ink);border:1px solid var(--color-rule);' +
    'box-shadow:0 8px 24px rgba(0,0,0,.28)';
  box.appendChild(tip);

  const vp = svg.querySelector('.viewport') as SVGGElement;
  const view = { scale: 1, tx: 0, ty: 0, touched: false };
  const apply = () =>
    vp.setAttribute('transform', `translate(${view.tx},${view.ty}) scale(${view.scale})`);

  // Parallel edges between one pair fan into lanes, so a dense graph does not
  // stack them invisibly on top of each other.
  const lanes = new Map<string, number>();
  {
    const groups = new Map<string, string[]>();
    for (const e of drawn) {
      const key = e.from < e.to ? `${e.from}>${e.to}` : `${e.to}>${e.from}`;
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(e.id);
    }
    for (const ids of groups.values()) {
      ids.forEach((id, i) => lanes.set(id, i - (ids.length - 1) / 2));
    }
  }

  const kinds = new Set(drawn.map((e) => e.type));
  const wires = new Map<string, { path: SVGPathElement; label: SVGTextElement }>();
  for (const e of drawn) {
    const isNew = fresh?.has(e.id) ?? false;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'none');
    // The same colour as the arrowhead it ends in — a line a shade quieter
    // than its own tip reads as two different things.
    path.setAttribute('stroke', isNew ? 'var(--color-yellow)' : 'var(--color-ink-faint)');
    path.setAttribute('stroke-opacity', isNew ? '1' : '0.55');
    path.setAttribute('stroke-width', isNew ? '2' : '1.3');
    path.setAttribute('marker-end', isNew ? 'url(#cqx-arrow-new)' : 'url(#cqx-arrow)');
    vp.appendChild(path);

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('font-size', '9.5');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', isNew ? 'var(--color-yellow)' : 'var(--color-ink-faint)');
    label.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
    label.textContent = e.type;
    // A label is worth the ink when it distinguishes one edge from another.
    // Writing `depends_on` twenty-three times on a graph where every edge is
    // `depends_on` tells a reader nothing and covers the ones that would —
    // and past a hundred edges any label is noise.
    if (kinds.size < 2 || drawn.length > 100) label.style.display = 'none';
    vp.appendChild(label);
    wires.set(e.id, { path, label });
  }

  const marks = new Map<string, SVGGElement>();
  for (const n of placed) {
    const isNew = fresh?.has(n.id) ?? false;
    const g = document.createElementNS(NS, 'g');
    g.style.cursor = onSelect ? 'pointer' : 'grab';

    const circle = document.createElementNS(NS, 'circle');
    const r = R + Math.round((n.weight ?? 0) * 8);
    circle.setAttribute('r', String(r));
    // `rule-soft` is a hairline colour, a shade off the panel it sits on, so
    // a node filled with it was a label floating in the dark. `rule` against
    // `ink-faint` is the quietest pair that still reads as an object.
    circle.setAttribute('fill', isNew ? 'var(--color-yellow)' : 'var(--color-rule)');
    circle.setAttribute('fill-opacity', isNew ? '0.3' : '1');
    circle.setAttribute('stroke', isNew ? 'var(--color-yellow)' : 'var(--color-ink-faint)');
    circle.setAttribute('stroke-width', isNew ? '2.5' : '1.2');
    g.appendChild(circle);

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('font-size', '11');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dy', String(r + 15));
    text.setAttribute('fill', 'var(--color-ink)');
    text.setAttribute('font-family', 'ui-monospace, SFMono-Regular, Menlo, monospace');
    // A halo in the panel's own colour, painted under the glyphs, so an edge
    // passing behind a caption does not strike through it.
    text.setAttribute('stroke', 'var(--color-panel)');
    text.setAttribute('stroke-width', '3.5');
    text.setAttribute('paint-order', 'stroke');
    text.setAttribute('stroke-linejoin', 'round');
    text.textContent = n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label;
    g.appendChild(text);

    g.addEventListener('pointerenter', () => {
      tip.textContent =
        `${n.label}${n.kind ? `  <${n.kind}>` : ''}` +
        (n.meta ? `\n${n.meta}` : '') +
        (isNew ? '\nnew at this commit' : '');
      tip.style.display = 'block';
    });
    g.addEventListener('pointermove', (event) => {
      const rect = box.getBoundingClientRect();
      tip.style.left = `${event.clientX - rect.left + 14}px`;
      tip.style.top = `${event.clientY - rect.top + 14}px`;
    });
    g.addEventListener('pointerleave', () => {
      tip.style.display = 'none';
    });
    vp.appendChild(g);
    marks.set(n.id, g);
  }

  function edgeAt(e: GraphEdge) {
    const a = byId.get(e.from)!;
    const b = byId.get(e.to)!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    const lane = Math.max(-5, Math.min(5, lanes.get(e.id) ?? 0));
    const side = e.from < e.to ? 1 : -1;
    const curve =
      (Math.min(20, d * 0.14) + Math.abs(lane) * 15) * (lane === 0 ? side : Math.sign(lane) || side);
    const cx = (a.x + b.x) / 2 - uy * curve;
    const cy = (a.y + b.y) / 2 + ux * curve;
    const wire = wires.get(e.id)!;
    wire.path.setAttribute(
      'd',
      `M ${a.x + ux * (R + 2)} ${a.y + uy * (R + 2)} Q ${cx} ${cy} ${b.x - ux * (R + 5)} ${
        b.y - uy * (R + 5)
      }`,
    );
    wire.label.setAttribute('x', String(0.25 * a.x + 0.5 * cx + 0.25 * b.x - uy * 9));
    wire.label.setAttribute('y', String(0.25 * a.y + 0.5 * cy + 0.25 * b.y + ux * 9 - 3));
  }

  function fit() {
    if (!placed.length) return;
    const xs = placed.map((n) => n.x);
    const ys = placed.map((n) => n.y);
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 80;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    view.scale = Math.min(BOX.w / w, BOX.h / h, 1);
    view.tx = (BOX.w - w * view.scale) / 2 - minX * view.scale;
    view.ty = (BOX.h - h * view.scale) / 2 - minY * view.scale;
    apply();
  }

  const base = -Math.max(140, 45 * Math.sqrt(placed.length));
  const sim = forceSimulation<Placed>(placed)
    .force('charge', forceManyBody<Placed>().strength((base * physics.repulsion) / 100))
    .force(
      'link',
      forceLink<Placed, { source: string; target: string }>(
        drawn.map((e) => ({ source: e.from, target: e.to })),
      )
        .id((d) => d.id)
        .distance(physics.linkDist),
    )
    .force('center', forceCenter(0, 0))
    .force('collide', forceCollide<Placed>(R + physics.pad))
    .force('x', forceX<Placed>(0).strength(physics.gravity / 100))
    .force('y', forceY<Placed>(0).strength(physics.gravity / 100))
    .alphaDecay(placed.length > 60 ? 0.012 : 0.0228)
    .on('tick', () => {
      for (const n of placed) marks.get(n.id)!.setAttribute('transform', `translate(${n.x},${n.y})`);
      for (const e of drawn) edgeAt(e);
      // Framed on every tick until somebody takes the view.
      //
      // Fitting once on the first tick frames the spiral the nodes start in,
      // not the graph they become — which is how a fourteen-crate workspace
      // ended up as a thumbnail in the middle of an empty canvas. Re-framing
      // costs one pass over the nodes and keeps the whole graph in sight
      // while it settles, which is also the part that looks alive.
      if (!view.touched) fit();
    });
  simRef.current = sim;

  tuneRef.current = (p: Physics) => {
    (sim.force('charge') as ReturnType<typeof forceManyBody>).strength((base * p.repulsion) / 100);
    (sim.force('link') as ReturnType<typeof forceLink>).distance(p.linkDist);
    (sim.force('collide') as ReturnType<typeof forceCollide>).radius(R + p.pad);
    (sim.force('x') as ReturnType<typeof forceX>).strength(p.gravity / 100);
    (sim.force('y') as ReturnType<typeof forceY>).strength(p.gravity / 100);
    if (sim.alpha() < 0.2) sim.alpha(0.25);
    sim.restart();
  };

  // --- the view: wheel to zoom, drag the background to pan, drag a node to
  // move it. A node keeps where it was put until it is dropped, which is what
  // makes a graph arrangeable rather than merely watchable.
  let dragging: Placed | null = null;
  let panning: { x: number; y: number } | null = null;
  let moved = false;

  const at = (event: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * (BOX.w / rect.width);
    const sy = (event.clientY - rect.top) * (BOX.h / rect.height);
    return { x: (sx - view.tx) / view.scale, y: (sy - view.ty) / view.scale, sx, sy };
  };

  const down = (event: PointerEvent) => {
    const group = (event.target as Element).closest('g');
    const hit = placed.find((n) => marks.get(n.id) === group);
    svg.setPointerCapture(event.pointerId);
    moved = false;
    view.touched = true;
    if (hit) {
      dragging = hit;
      sim.alphaTarget(0.3).restart();
      const p = at(event);
      hit.fx = p.x;
      hit.fy = p.y;
    } else {
      const p = at(event);
      panning = { x: p.sx - view.tx, y: p.sy - view.ty };
    }
  };
  const move = (event: PointerEvent) => {
    if (dragging) {
      moved = true;
      const p = at(event);
      dragging.fx = p.x;
      dragging.fy = p.y;
    } else if (panning) {
      moved = true;
      const p = at(event);
      view.tx = p.sx - panning.x;
      view.ty = p.sy - panning.y;
      apply();
    }
  };
  const up = (event: PointerEvent) => {
    if (dragging) {
      // Released rather than pinned: a dropped node rejoins the simulation,
      // which is what lets the rest of the graph respond to where it was put.
      dragging.fx = null;
      dragging.fy = null;
      sim.alphaTarget(0);
      if (!moved && onSelect) onSelect(dragging.id);
    }
    dragging = null;
    panning = null;
    try {
      svg.releasePointerCapture(event.pointerId);
    } catch {
      // Already released; the browser is entitled to have done it for us.
    }
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    view.touched = true;
    const rect = svg.getBoundingClientRect();
    const sx = (event.clientX - rect.left) * (BOX.w / rect.width);
    const sy = (event.clientY - rect.top) * (BOX.h / rect.height);
    const factor = Math.exp(-event.deltaY * 0.0015);
    const next = Math.max(0.15, Math.min(4, view.scale * factor));
    // Zoom about the pointer rather than the origin, so the thing under the
    // cursor stays under the cursor.
    view.tx = sx - ((sx - view.tx) * next) / view.scale;
    view.ty = sy - ((sy - view.ty) * next) / view.scale;
    view.scale = next;
    apply();
  };

  svg.addEventListener('pointerdown', down);
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', up);
  svg.addEventListener('pointercancel', up);
  svg.addEventListener('wheel', wheel, { passive: false });

  return () => {
    sim.stop();
    simRef.current = null;
    tuneRef.current = null;
    svg.removeEventListener('pointerdown', down);
    svg.removeEventListener('pointermove', move);
    svg.removeEventListener('pointerup', up);
    svg.removeEventListener('pointercancel', up);
    svg.removeEventListener('wheel', wheel);
    box.innerHTML = '';
  };
}
