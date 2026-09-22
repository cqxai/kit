// Import the packed artifact from a separate project, so self-reference and
// files left in this checkout cannot hide an empty tarball or broken exports.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = join(root, '.tmp');
await mkdir(temporary, { recursive: true, mode: 0o700 });
const work = await mkdtemp(join(temporary, 'packed-consumer-'));
try {
  const [dry] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root }));
  console.log(`npm pack --dry-run: ${dry.id}`);
  for (const file of dry.files) console.log(`  ${file.path} (${file.size} bytes)`);
  assert.equal(dry.name, '@cqxai/kit');
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: root }));
  const consumer = join(work, 'consumer');
  await mkdir(consumer);
  await writeFile(join(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(work, packed.filename)],
    { cwd: consumer, stdio: 'inherit' });
  await writeFile(join(consumer, 'check.mjs'), `
    import assert from 'node:assert/strict';
    import { access, readFile } from 'node:fs/promises';
    import { policy, band, parsePath, toPath } from '@cqxai/kit/engine';
    import { brand, palette } from '@cqxai/kit/brand';
    import { Profile } from '@cqxai/kit/ui';
    import { answer } from '@cqxai/kit/gh';
    assert.equal(policy.readers, 4);
    assert.equal(band(74), 'warn');
    assert.equal(toPath(parsePath('/o/r/abc1234f/packages/p/types', '#T', '')),
      '/o/r/abc1234f/packages/p/types#T');
    assert.equal(brand.palette, palette);
    assert.equal(palette.light.green, '#2e7d5b');
    assert.equal(typeof Profile, 'function');
    assert.equal(typeof answer, 'function');
    const css = await readFile(new URL(import.meta.resolve('@cqxai/kit/brand/brand.css')), 'utf8');
    assert.ok(css.includes('--green: #2e7d5b;'));
    const manifestURL = new URL(import.meta.resolve('@cqxai/kit/package.json'));
    const manifest = JSON.parse(await readFile(manifestURL, 'utf8'));
    for (const [name, entry] of Object.entries(manifest.exports)) {
      await access(new URL(import.meta.resolve('@cqxai/kit' + name.slice(1))));
      for (const file of typeof entry === 'string' ? [entry] : Object.values(entry)) {
        await access(new URL(file, manifestURL));
      }
      console.log('packed export resolves: @cqxai/kit' + name.slice(1));
    }
    console.log('Packed consumer imports engine, brand, CSS, UI and GitHub proxy successfully.');
  `);
  execFileSync(process.execPath, ['check.mjs'], { cwd: consumer, stdio: 'inherit' });
} finally {
  await rm(work, { recursive: true, force: true });
}
