'use client';

import { useMemo } from 'react';

import { packageEdges, type Package, type RepoMeta } from '../../engine/index.js';

/**
 * The cover is the repository's own dependency graph.
 *
 * A profile of a person opens with a photograph they chose. A repository has
 * none to choose, so it gets one made of the thing only we hold: its crates,
 * sized by how much of it they are, joined by what depends on what. Every
 * repository's is different and nobody had to pick it.
 *
 * Laid out here rather than by the force simulation the Packages view uses.
 * A cover is 176 pixels tall and decorative; running a physics loop sixty
 * times a second behind a name is a cost with no reader on the other end of
 * it. This is a deterministic arc — same repository, same picture, every
 * time, which also means it does not shuffle itself on a re-render.
 */
function art(packages: Package[]): { nodes: { x: number; y: number; r: number }[]; edges: string[] } {
  // The largest dozen, because a hundred circles at this size is a texture
  // rather than a picture.
  const top = [...packages].sort((a, b) => b.lines - a.lines).slice(0, 12);
  if (top.length === 0) return { nodes: [], edges: [] };
  const most = Math.max(...top.map((p) => p.lines), 1);
  const nodes = top.map((p, i) => {
    const t = top.length === 1 ? 0.5 : i / (top.length - 1);
    return {
      id: p.id,
      x: 70 + t * 860,
      // A sine rather than a random: it reads as a curve somebody drew and
      // never as a mistake, which is what scattered points at this size look
      // like.
      y: 96 + Math.sin(t * Math.PI * 2.1 + 0.6) * 46,
      r: 7 + Math.round((p.lines / most) * 13),
    };
  });
  const at = new Map(nodes.map((n) => [n.id, n]));
  const edges = packageEdges(top)
    .map(({ from, to }) => {
      const a = at.get(from.id);
      const b = at.get(to.id);
      if (!a || !b) return null;
      return `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 38} ${b.x} ${b.y}`;
    })
    .filter((d): d is string => d !== null)
    .slice(0, 22);
  return { nodes, edges };
}

export function Cover({
  repo,
  meta,
  crates,
  files,
  lines,
  packages,
  faceRef,
}: {
  repo: string;
  meta: RepoMeta | null;
  crates: number;
  files: number;
  lines: number;
  packages: Package[];
  faceRef: React.RefObject<HTMLElement | null>;
}) {
  const { nodes, edges } = useMemo(() => art(packages), [packages]);
  const owner = repo.split('/')[0] ?? '';

  return (
    /* It does not clip: the avatar is meant to break its lower edge and hang
       over the tab row. The image clips itself instead. */
    <div data-cqx="cover" className="relative border border-b-0 border-rule bg-panel">
      {/* Dark in every theme, and not from the palette. A cover is a
          photograph's slot: the name and the caption are laid over it in
          white, and a ground that follows a light theme leaves both of them
          invisible. The deployment can still override it — a repository's
          own colours are exactly the kind of thing a host may want — but the
          default has to be legible before anybody sets one. */}
      <div className="relative h-[176px] overflow-hidden bg-[linear-gradient(160deg,var(--cover-a,#191b20)_0%,var(--cover-b,#24272f)_55%,var(--cover-c,#12141a)_100%)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1000 176"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <g stroke="var(--color-accent)" strokeOpacity="0.5" fill="none" strokeWidth="1">
            {edges.map((d, i) => <path key={i} d={d} />)}
          </g>
          <g fill="var(--color-accent)" fillOpacity="0.65">
            {nodes.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={n.r} />)}
          </g>
        </svg>
        {/* Bottom right, out of the way of the name and the avatar. */}
        <span data-cqx="size" className="absolute bottom-2.5 right-3 font-mono text-[10.5px] tracking-[0.03em] text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,.5)]">
          {crates.toLocaleString()} crates · {files.toLocaleString()} files ·{' '}
          {lines.toLocaleString()} lines
        </span>
      </div>

      {/* Round. There is no winning the argument against circular avatars. */}
      <span
        ref={faceRef as React.RefObject<HTMLSpanElement>}
        data-cqx="face"
        className="absolute bottom-[-60px] left-4 z-30 box-border block h-[100px] w-[100px] rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(0,0,0,.28)] side:h-[100px] side:w-[100px] max-side:bottom-2.5 max-side:h-[72px] max-side:w-[72px] max-side:z-[5]"
      >
        <img
          className="block h-full w-full rounded-full object-cover"
          src={meta?.avatar ?? `https://github.com/${owner}.png`}
          alt=""
          width={100}
          height={100}
        />
      </span>

      <div className="absolute bottom-3.5 left-[140px] text-white [text-shadow:0_1px_3px_rgba(0,0,0,.55)] max-side:left-[100px]">
        <h1 className="m-0 font-display text-[25px] font-bold leading-[1.1] tracking-[-0.01em] max-side:text-[20px]">
          {repo}
        </h1>
        {meta?.description ? (
          <p className="m-0 mt-0.5 max-w-[620px] text-[12.5px] text-white/85">{meta.description}</p>
        ) : null}
      </div>
    </div>
  );
}
