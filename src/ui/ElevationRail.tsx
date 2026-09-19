import type { LevelId } from '../engine/index.js';

export interface Elevation {
  id: LevelId;
  name: string;
  count: string;
}

/**
 * The primary navigation.
 *
 * L0 to L3 narrow a scope; L4 and L5 are two lenses on the same leaf level,
 * related by use rather than containment. The rail does not try to express
 * that — the levels themselves do.
 *
 * A strip that scrolls sideways on a phone, a column from `side` up. The
 * marker moves with it: a left edge beside a column, a bottom edge under a
 * strip.
 */
const ITEM = [
  'grid shrink-0 cursor-pointer items-center gap-[9px] whitespace-nowrap',
  'border-0 bg-transparent px-2.5 py-[9px] text-left text-ink-soft',
  'grid-cols-[26px_1fr]',
  'border-b-2 border-rule-soft side:border-b-0 side:border-l-2',
  'hover:bg-rule-soft hover:text-ink',
  'aria-[current=true]:border-button aria-[current=true]:bg-rule-soft aria-[current=true]:text-ink',
].join(' ');

export function ElevationRail({
  levels,
  current,
  onSelect,
}: {
  levels: Elevation[];
  current: LevelId;
  onSelect: (id: LevelId) => void;
}) {
  return (
    <nav className="flex shrink-0 flex-row gap-1.5 overflow-x-auto side:flex-col side:gap-px side:overflow-visible">
      <h3 className="mb-2 ml-0.5 hidden font-mono text-[10px] uppercase tracking-[0.11em] text-ink-faint side:block">
        Elevation
      </h3>
      {levels.map((l) => (
        <button
          key={l.id}
          className={ITEM}
          aria-current={l.id === current}
          onClick={() => onSelect(l.id)}
        >
          <span className="font-mono text-[11px] font-bold text-accent">{l.id}</span>
          <span>
            <span className="text-[13.5px] font-medium">{l.name}</span>
            <br />
            {/* The count is context, and a phone has no room for context. */}
            <span className="hidden font-mono text-[11px] text-ink-faint side:inline">
              {l.count}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}
