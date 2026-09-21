import { mkdir, readFile, writeFile } from 'node:fs/promises';
import tokens from './tokens.json' with { type: 'json' };

const header = 'Generated from src/brand/tokens.json by src/brand/generate.ts. Do not edit; run npm run brand.';
const modes = ['light', 'dark'] as const;
type Mode = typeof modes[number];
type Band = keyof Pick<typeof tokens.palette.light, 'green' | 'yellow' | 'red' | 'brown'>;

// The same resolved object feeds CSS and JS. RN keeps the camel-cased palette
// (including grid) used by cqx-mobileapp/src/theme/colors.ts.
const palette = {
  light: { ...tokens.palette.light, grid: tokens.grid.color.light },
  dark: { ...tokens.palette.dark, grid: tokens.grid.color.dark },
};
const brand = { ...tokens, palette };
const kebab = (key: string) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const property = (key: string) => key.startsWith('code') ? `color-${kebab(key)}` : kebab(key);
const declaration = (key: string, value: string | number) => `  --${key}: ${value};`;

function theme(mode: Mode): string {
  const stripePalette = palette[tokens.stripe.palette[mode] as Mode];
  return [
    `  color-scheme: ${mode};`,
    ...Object.entries(palette[mode]).map(([key, value]) => declaration(property(key), value)),
    ...tokens.stripe.order.map((band) => declaration(`band-${band}`, stripePalette[band as Band])),
  ].join('\n');
}

function typeProperties(): string[] {
  return Object.entries(tokens.typeScale).flatMap(([role, style]) =>
    Object.entries(style).map(([key, value]) => {
      const unit = key.endsWith('Em') ? 'em' : key === 'fontWeight' ? '' : 'px';
      return declaration(`type-${role}-${kebab(key.replace(/Em$/, ''))}`, `${value}${unit}`);
    }),
  );
}

function stylesheet(): string {
  const { stripe, grid } = tokens;
  const geometry = [
    declaration('stripe-position', stripe.position),
    declaration('stripe-inset-block', `${stripe.insetBlock}px`),
    declaration('stripe-left', `${stripe.left}px`),
    declaration('stripe-width', `${stripe.width}px`),
    declaration('stripe-display', stripe.display),
    declaration('stripe-band-flex', stripe.bandFlex),
    declaration('stripe-z-index', stripe.zIndex),
    declaration('stripe-pointer-events', stripe.pointerEvents),
    declaration('grid-size', `${grid.size}px ${grid.size}px`),
    declaration('grid-line-width', `${grid.lineWidth}px`),
    ...typeProperties(),
  ].join('\n');
  const bands = stripe.order.map((band, index) =>
    `.cqx-stripes > span:nth-child(${index + 1}) { background-color: var(--band-${band}); }`,
  ).join('\n');
  return `/* ${header} */

:root {
${theme('light')}
${geometry}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${theme('dark').replace(/^/gm, '  ')}
  }
}

:root[data-theme="dark"] {
${theme('dark')}
}

@media (max-width: ${stripe.narrow.maxWidth}px) {
  :root {
    --stripe-left: ${stripe.narrow.left}px;
    --stripe-width: ${stripe.narrow.width}px;
  }
}

/* ${stripe.insetReason} */
.cqx-stripes {
  position: var(--stripe-position);
  inset-block: var(--stripe-inset-block);
  left: var(--stripe-left);
  width: var(--stripe-width);
  display: var(--stripe-display);
  z-index: var(--stripe-z-index);
  pointer-events: var(--stripe-pointer-events);
}

.cqx-stripes > span { flex: var(--stripe-band-flex); }
${bands}

.cqx-grid {
  background-color: var(--ground);
  background-image:
    linear-gradient(to right, var(--grid) var(--grid-line-width), transparent var(--grid-line-width)),
    linear-gradient(to bottom, var(--grid) var(--grid-line-width), transparent var(--grid-line-width));
  background-size: var(--grid-size);
}
`;
}

// Literal declarations keep stripe order/palette references useful to typed
// consumers without pulling the generator or a JSON loader into their app.
function typeOf(value: unknown, depth = 0): string {
  if (Array.isArray(value)) return `readonly [${value.map((child) => typeOf(child, depth)).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    const indent = '  '.repeat(depth);
    return `{\n${Object.entries(value).map(([key, child]) =>
      `${indent}  readonly ${JSON.stringify(key)}: ${typeOf(child, depth + 1)};`,
    ).join('\n')}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function outputs(): Record<string, string> {
  const aliases = ['palette', 'stripe', 'grid', 'typeScale'] as const;
  return {
    'brand.css': stylesheet(),
    'index.js': `// ${header}\n\nexport const brand = ${JSON.stringify(brand, null, 2)};\n\n` +
      aliases.map((name) => `export const ${name} = brand.${name};\n`).join('') +
      modes.map((mode) => `export const ${mode} = palette.${mode};\n`).join(''),
    'index.d.ts': `// ${header}\n\nexport declare const brand: ${typeOf(brand)};\n\n` +
      aliases.map((name) => `export declare const ${name}: typeof brand.${name};\n`).join('') +
      modes.map((mode) => `export declare const ${mode}: typeof palette.${mode};\n`).join('') +
      'export type Mode = keyof typeof palette;\n' +
      'export type ThemeColors = { [Key in keyof typeof light]: string };\n',
  };
}

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  throw new Error('Usage: node src/brand/generate.ts [--check]');
}
const check = args[0] === '--check';
const directory = new URL('../../dist/brand/', import.meta.url);
if (!check) await mkdir(directory, { recursive: true });
let stale = false;
for (const [name, expected] of Object.entries(outputs())) {
  const path = new URL(name, directory);
  if (check) {
    let actual: string | undefined;
    try {
      actual = await readFile(path, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    if (actual !== expected) {
      console.error(`FAIL dist/brand/${name} ${actual === undefined ? 'is missing' : 'differs from src/brand/tokens.json'}. Run npm run brand and commit the outputs.`);
      stale = true;
    }
  } else {
    await writeFile(path, expected);
    console.log(`Generated dist/brand/${name}`);
  }
}
if (stale) process.exitCode = 1;
else if (check) console.log('Brand outputs match src/brand/tokens.json.');
