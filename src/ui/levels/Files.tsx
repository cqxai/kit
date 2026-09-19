import type { FileNode } from '../../engine/index.js';

import { EffectBadges } from '../EffectBadges.js';
import { CARD, CARD_GRID, CARD_META, CARD_NAME, EMPTY, H2, LEDE } from '../classes.js';

export function FilesLevel({
  files,
  scopeName,
  onSelect,
}: {
  files: FileNode[];
  scopeName: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 className={H2}>{files.length.toLocaleString()} files</h2>
      <p className={LEDE}>
        {scopeName ? `In ${scopeName}. ` : ''}
        Ordered by size. Selecting one scopes Types and Functions.
      </p>
      <div className={CARD_GRID}>
        {files.length === 0 ? (
          <div className={EMPTY}>No files in scope.</div>
        ) : (
          [...files].sort((a, b) => b.lines - a.lines).map((f) => (
            <button className={CARD} key={f.id} onClick={() => onSelect(f.id)}>
              <span className={CARD_NAME}>
                {f.path.split('/').slice(2).join('/') || f.path}
              </span>
              <span className={CARD_META}>
                <span>{f.lines.toLocaleString()} lines</span>
                <span>{f.n.toLocaleString()} symbols</span>
              </span>
              <EffectBadges effects={f.eff} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
