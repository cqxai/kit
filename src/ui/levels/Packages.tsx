import type { Package } from '../../engine/index.js';

import { EffectBadges } from '../EffectBadges.js';
import { BAR, BAR_FILL, CARD, CARD_GRID, CARD_META, CARD_NAME, H2, LEDE } from '../classes.js';

export function PackagesLevel({
  packages,
  onSelect,
}: {
  packages: Package[];
  onSelect: (id: string) => void;
}) {
  const largest = Math.max(...packages.map((p) => p.lines), 1);
  return (
    <div>
      <h2 className={H2}>{packages.length} crates</h2>
      <p className={LEDE}>
        Sized by lines, badged by what each reaches. Selecting one scopes every elevation below.
      </p>
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
    </div>
  );
}
