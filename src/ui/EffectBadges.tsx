import type { EffectKind } from '../engine/index.js';
import { EFFECT_LABEL, EFFECT_ORDER } from '../engine/index.js';

/**
 * Effects a node carries, dangerous ones first.
 *
 * Structural facts are numerous and quiet; these are few and worth reading, so
 * they are what a card shows.
 */
const BADGE =
  'whitespace-nowrap rounded border px-1.5 py-px font-mono text-[10.5px] leading-[1.45]';

/** Only the ones worth colouring. The rest read as facts, not warnings. */
const TONE: Partial<Record<EffectKind, string>> = {
  spawns: 'border-button text-accent',
  reads_env: 'border-button text-accent',
  effect_exec: 'border-red text-red',
  unsafe_at: 'border-yellow text-yellow',
};

const QUIET = 'border-rule text-ink-soft';

export function EffectBadges({
  effects,
  extra,
}: {
  effects: Partial<Record<EffectKind, number>>;
  extra?: React.ReactNode;
}) {
  const shown = EFFECT_ORDER.filter((k) => effects[k]);
  return (
    <div className="flex flex-wrap gap-1">
      {shown.length === 0 && !extra ? (
        <span className={`${BADGE} ${QUIET}`}>no effects</span>
      ) : null}
      {shown.map((k) => (
        <span key={k} className={`${BADGE} ${TONE[k] ?? QUIET}`}>
          {EFFECT_LABEL[k]} {effects[k]}
        </span>
      ))}
      {extra}
    </div>
  );
}
