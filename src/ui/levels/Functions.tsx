import type { FunctionDecl, TypePart } from '../../engine/index.js';
import { EFFECT_LABEL } from '../../engine/index.js';
import { pinned } from '../../engine/index.js';

import { EMPTY, H2, LEDE } from '../classes.js';

/**
 * One row per component of a type, with the crate that owns it.
 *
 * `—` means the extractor cannot say rather than "primitive": a name defined in
 * two crates is ambiguous without resolution, and guessing is what made another
 * metric non-deterministic.
 *
 * `display: contents` on the wrapper, so each part's three cells land in the
 * grid the parent declares rather than in a row of their own.
 */
function Annotation({
  label,
  written,
  parts,
}: {
  label: string;
  written: string;
  parts: TypePart[];
}) {
  return (
    <>
      {parts.map(([base, owner, depth], i) => (
        <div key={i} className="contents">
          <div className={depth ? 'pl-3.5 text-ink-faint' : 'text-ink-soft'}>
            {depth ? `└ ${base}` : label}
          </div>
          <div className="text-ink">{depth ? base : written}</div>
          <div className={owner ? (owner === '~' ? 'text-yellow' : 'text-accent') : 'text-ink-faint'}>
            {owner === '~' ? 'ambiguous' : (owner ?? '—')}
          </div>
        </div>
      ))}
    </>
  );
}

const CARD = 'rounded-lg border border-rule-soft bg-panel px-3.5 py-3';
/* Where search sent you: the edge thickens and takes the mark's colour. */
const FOUND = 'border-button border-l-[3px]';

export function FunctionsLevel({
  functions,
  focus,
  notable,
  total,
  limit = 40,
}: {
  functions: FunctionDecl[];
  focus: string | null;
  notable: number;
  total: number;
  limit?: number;
}) {
  const { list, marked } = pinned(functions, focus);
  const shown = list.slice(0, limit);
  return (
    <div>
      <h2 className={H2}>Functions</h2>
      <p className={LEDE}>
        Signatures with the crate that owns each type underneath. Showing those that carry an
        effect, return an unstructured error, or take three or more parameters —{' '}
        {notable.toLocaleString()} of {total.toLocaleString()}.
      </p>
      {shown.length === 0 ? (
        <div className={EMPTY}>No notable functions in scope.</div>
      ) : (
        /* One column, or two once there is room for two. */
        <div className="grid gap-2 wide:grid-cols-2">
          {shown.map((f) => {
            const params = f.p.map(([name, written]) => `${name}: ${written}`).join(', ');
            return (
              <div className={marked.has(f) ? `${CARD} ${FOUND}` : CARD}
                data-cqx={marked.has(f) ? 'found' : undefined}
                key={f.id}>
                <div className="mb-[7px] flex flex-wrap items-baseline gap-2.5">
                  <span className="font-mono text-[13.5px] font-semibold">{f.name}</span>
                  <span className="flex flex-wrap gap-1">
                    {f.eff.map((k) => (
                      <span
                        key={k}
                        className="whitespace-nowrap rounded border border-button px-1.5 py-px font-mono text-[10.5px] leading-[1.45] text-accent"
                      >
                        {EFFECT_LABEL[k]}
                      </span>
                    ))}
                  </span>
                  <span className="ml-auto font-mono text-[11px] text-ink-faint">
                    {f.file ?? ''}
                  </span>
                </div>
                <code className="mb-2 block whitespace-pre-wrap font-mono text-[12.5px] text-ink [overflow-wrap:anywhere]">
                  fn {f.name}({params}){f.r ? ` -> ${f.r[0]}` : ''}
                </code>
                <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-3.5 gap-y-0.5 font-mono text-[11.5px]">
                  {f.p.map(([name, written, parts], i) => (
                    <Annotation key={i} label={name} written={written} parts={parts} />
                  ))}
                  {f.r ? <Annotation label="→" written={f.r[0]} parts={f.r[1]} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className={`${LEDE} mt-2.5`}>
        {functions.length.toLocaleString()} in scope
        {functions.length > limit ? `, first ${limit} shown` : ''}.
      </p>
    </div>
  );
}
