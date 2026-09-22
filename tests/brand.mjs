import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { brand, light, dark, palette, stripe, grid, typeScale } from '@cqxai/kit/brand';

const root = new URL('../', import.meta.url);

test('the public RN export contains the source palettes and numeric dimensions', () => {
  assert.equal(brand.palette, palette);
  assert.equal(light, palette.light);
  assert.equal(dark, palette.dark);
  assert.deepEqual([light.green, light.yellow, light.red, light.brown],
    ['#2e7d5b', '#e0a72e', '#c03b2e', '#8a5a3c']);
  assert.deepEqual([dark.green, dark.yellow, dark.red, dark.brown],
    ['#3fa574', '#edbe52', '#e0594a', '#a2704c']);
  assert.deepEqual([light.inkSoft, dark.inkSoft], ['#55483f', '#a9a08f']);
  assert.deepEqual([light.buttonInk, dark.buttonInk], ['#241c17', '#15161a']);
  assert.deepEqual([light.accent, dark.accent], ['#c03b2e', '#e0594a']);
  assert.deepEqual([light.grid, dark.grid],
    ['rgba(36, 28, 23, 0.022)', 'rgba(242, 235, 220, 0.018)']);
  assert.equal(grid.size, 28);
  assert.equal(grid.lineWidth, 1);
  assert.deepEqual(typeScale.body, { fontSize: 14, lineHeight: 23 });
  assert.deepEqual(typeScale.wordmark, { fontSize: 34, lineHeight: 42, letterSpacing: -1.5 });
  assert.deepEqual(typeScale.display, { fontWeight: 800, letterSpacingEm: -0.02 });
  assert.equal(typeScale.cycle.fontSizeEm, 0.74);
});

test('the stripe selects the opposite palette in mark order, flush at both sizes', () => {
  assert.deepEqual(stripe.order, ['green', 'yellow', 'red', 'brown']);
  assert.deepEqual(stripe.palette, { light: 'dark', dark: 'light' });
  assert.deepEqual(stripe.order.map((band) => palette[stripe.palette.dark][band]),
    ['#2e7d5b', '#e0a72e', '#c03b2e', '#8a5a3c']);
  assert.deepEqual(stripe.order.map((band) => palette[stripe.palette.light][band]),
    ['#3fa574', '#edbe52', '#e0594a', '#a2704c']);
  assert.equal(stripe.position, 'fixed');
  assert.equal(stripe.insetBlock, 0);
  assert.equal(stripe.display, 'flex');
  assert.equal(stripe.bandFlex, 1);
  assert.deepEqual([stripe.left, stripe.width], [0, 23]);
  assert.deepEqual(stripe.narrow, { maxWidth: 720, left: 0, width: 10 });
});

test('CSS is exported and marked as a side effect for web bundlers', async () => {
  const css = import.meta.resolve('@cqxai/kit/brand/brand.css');
  assert.equal(css, new URL('../dist/brand/brand.css', import.meta.url).href);
  assert.ok((await readFile(new URL(css), 'utf8')).startsWith('/* Generated from src/brand/tokens.json'));
  const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.ok(manifest.sideEffects.includes('./dist/brand/brand.css'));
});

test('the checker rejects edits and missing outputs without repairing them; regeneration uses new tokens', async () => {
  const temporary = new URL('.tmp/', root);
  await mkdir(temporary, { recursive: true, mode: 0o700 });
  const fixture = await mkdtemp(fileURLToPath(new URL('brand-test-', temporary)));
  const artifacts = ['brand.css', 'index.js', 'index.d.ts'];
  const files = ['src/brand/generate.ts', 'src/brand/tokens.json',
    ...artifacts.map((name) => `dist/brand/${name}`)];
  try {
    await mkdir(`${fixture}/src/brand`, { recursive: true });
    await mkdir(`${fixture}/dist/brand`, { recursive: true });
    for (const path of files) await copyFile(new URL(path, root), `${fixture}/${path}`);
    const run = (...args) => {
      const result = spawnSync(process.execPath, ['src/brand/generate.ts', ...args], {
        cwd: fixture, encoding: 'utf8',
      });
      if (result.error) throw result.error;
      return result;
    };
    assert.equal(run('--check').status, 0);
    for (const name of artifacts) {
      const path = `${fixture}/dist/brand/${name}`;
      const original = await readFile(path, 'utf8');
      const edited = original + '\n/* Hand edit: must not survive review. */\n';
      await writeFile(path, edited);
      const rejected = run('--check');
      assert.equal(rejected.status, 1, rejected.stderr);
      assert.ok(rejected.stderr.includes(`FAIL dist/brand/${name} differs`));
      assert.equal(await readFile(path, 'utf8'), edited, 'checking must not repair drift');
      await writeFile(path, original);
    }
    await rm(`${fixture}/dist/brand/index.js`);
    assert.equal(run('--check').status, 1, 'a missing output must fail closed');
    const sourcePath = `${fixture}/src/brand/tokens.json`;
    const source = JSON.parse(await readFile(sourcePath, 'utf8'));
    source.palette.light.green = '#010203';
    source.stripe.narrow.left = 7;
    await writeFile(sourcePath, JSON.stringify(source));
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    const changed = await import(`${fixture}/dist/brand/index.js`);
    assert.equal(changed.light.green, '#010203');
    assert.equal(changed.stripe.narrow.left, 7);
    const css = await readFile(`${fixture}/dist/brand/brand.css`, 'utf8');
    assert.ok(css.includes('--green: #010203;'));
    assert.ok(css.includes('--band-green: #010203;'));
    assert.ok(css.includes('--stripe-left: 7px;'));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
