import type { TypeDecl } from '../../engine/index.js';
import { pinned } from '../../engine/index.js';

import { ACC, DIM, H2, LEDE, TABLE, TABLE_WRAP, TD, TH, TR, TR_FOUND } from '../classes.js';

/**
 * Type declarations this repository owns.
 *
 * Ordering by use and showing everything would put `str`, `Path` and `Result`
 * at the top, which says nothing about this codebase. Restricted to what the
 * repository declares, the ordering becomes informative — and it surfaces that
 * most declarations appear in no signature at all.
 */
export function TypesLevel({
  types,
  focus,
  limit = 120,
}: {
  types: TypeDecl[];
  focus: string | null;
  limit?: number;
}) {
  const { list, marked } = pinned(types, focus);
  const shown = list.slice(0, limit);
  return (
    <div>
      <h2 className={H2}>Types</h2>
      <p className={LEDE}>
        Declarations this repository owns, ordered by how often they appear in a signature. A
        type used nowhere is not necessarily dead, but it is not part of any contract.
      </p>
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr>
              {['type', 'kind', 'crate', 'used in', 'fields'].map((h) => (
                <th key={h} className={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr><td colSpan={5} className={`${TD} ${DIM}`}>No types in scope.</td></tr>
            ) : (
              shown.map((t) => (
                <tr key={t.id} className={marked.has(t) ? `${TR} ${TR_FOUND}` : TR}
                  data-cqx={marked.has(t) ? 'found' : undefined}>
                  <td className={TD}><b>{t.name}</b></td>
                  <td className={`${TD} ${DIM}`}>{t.k}</td>
                  <td className={`${TD} ${ACC}`}>{t.pkg ?? ''}</td>
                  <td className={TD}>{t.uses > 0 ? t.uses : <span className={DIM}>0</span>}</td>
                  <td className={`${TD} ${DIM}`}>
                    {t.fields.length
                      ? t.fields.slice(0, 4).map(([n, ty]) => `${n}: ${ty}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className={`${LEDE} mt-2.5`}>
        {types.length.toLocaleString()} shown{types.length > limit ? ` (first ${limit})` : ''}.
      </p>
    </div>
  );
}
