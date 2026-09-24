import { Fragment } from 'react';

/**
 * A name that may wrap at its own seams.
 *
 * What the scorer writes about code is full of names with no spaces in them —
 * `react_compiler_inference::propagate_scope_dependencies_hir::convert_hoisted_lvalue`,
 * `crates/core/src/lib.rs`, `cryptocorrosion/cryptocorrosion`. A browser only
 * breaks a line at a space, so a name like that is one ninety-character word,
 * and on a phone it pushes the whole page sideways.
 *
 * A `<wbr>` after each separator says "break here if you have to", which puts
 * the break where a reader would put it: between the parts of the path, not
 * halfway through one. It adds no characters, so what is copied is what was
 * written. Where a name has no separators left to break at, the element that
 * holds it still needs `[overflow-wrap:anywhere]`; this only chooses where the
 * break falls first.
 *
 * No hooks, so it renders on a server as readily as in a client tree.
 */
export function Breakable({ text }: { text: string }) {
  const parts = text.split(SEAM);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <wbr /> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}

/** After a Rust path's `::`, a module or file's `.`, and a path's `/`. */
const SEAM = /(?<=::|\.|\/)(?!$)/;
