import type { EffectRow } from '../../engine/index.js';

import { ACC, DIM, H2, HOT, LEDE, LOC, SECT, TABLE, TABLE_WRAP, TD, TH, TR } from '../classes.js';

/**
 * What the binaries touch outside themselves.
 *
 * The only elevation small enough to read whole, which is why it leads with a
 * table rather than a grid.
 */
export function SystemLevel({ effects }: { effects: EffectRow[] }) {
  const spawns = new Map<string, EffectRow[]>();
  const envs = new Map<string, number>();
  for (const e of effects) {
    if (e.k === 'spawns') spawns.set(e.to, [...(spawns.get(e.to) ?? []), e]);
    if (e.k === 'reads_env') envs.set(e.to, (envs.get(e.to) ?? 0) + 1);
  }

  const provenance = (row: EffectRow) => {
    if (row.via === 'env')
      return (
        <>
          <span className={ACC}>{row.src}()</span> <span className={DIM}>←</span>{' '}
          <span className={HOT}>${row.env?.split(',')[0]}</span>
        </>
      );
    if (row.via === 'fn') return <><span className={DIM}>from</span> {row.src}()</>;
    if (row.via === 'unresolved') return <span className={DIM}>unresolved</span>;
    return <span className={DIM}>literal</span>;
  };

  return (
    <div>
      <h2 className={H2}>What it touches outside itself</h2>
      <p className={LEDE}>
        Every process, variable and capability the binaries can reach. The only elevation small
        enough to read whole.
      </p>

      <div className={SECT}>Processes it can start</div>
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr>
              {['target', 'sites', 'how the name is decided', 'first site'].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...spawns.entries()]
              .sort((a, b) => b[1].length - a[1].length)
              .map(([name, rows]) => {
                const first = rows[0]!;
                return (
                  <tr key={name} className={TR}>
                    <td className={TD}>
                      {name === '<dynamic>' ? <span className={DIM}>&lt;dynamic&gt;</span> : <b>{name}</b>}
                    </td>
                    <td className={TD}>{rows.length}</td>
                    <td className={TD}>{provenance(first)}</td>
                    <td className={`${TD} ${LOC}`}>{first.file}:{first.line}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <div className={SECT}>Environment variables read</div>
      <div className="flex flex-wrap gap-1">
        {[...envs.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => (
            <span
              key={name}
              className={
                'whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10.5px] leading-[1.45] ' +
                (name === '<dynamic>' ? 'border-rule text-ink-soft' : 'border-button text-accent')
              }
            >
              {name} {count}
            </span>
          ))}
      </div>
    </div>
  );
}
