// Shared by the copies-agree tests (WP-07): the real build's dist/db.json, and a module-private old copy read from its
// source. Builds first when dist/db.json is missing (npm run build; dist/ is gitignored).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const root = fileURLToPath(new URL('../..', import.meta.url));

let db;
/** The compiled database of the current data, built once per process. */
export function realDb() {
  if (db) return db;
  const path = join(root, 'dist/db.json');
  if (!existsSync(path)) {
    const build = spawnSync('npm', ['run', 'build'], { cwd: root, encoding: 'utf8' });
    assert.equal(build.status, 0, `npm run build failed:\n${build.stderr}`);
  }
  db = JSON.parse(readFileSync(path, 'utf8'));
  return db;
}

export const source = (file) => readFileSync(join(root, file), 'utf8');

/**
 * A copy the old module does not export: the one source line `pattern` matches, its first group evaluated as an
 * expression. Fails when the line is gone or appears twice, so a moved or edited copy is noticed, not skipped.
 */
export function privateCopy(file, pattern) {
  const expr = privateText(file, pattern);
  return { text: expr, value: new Function(`return (${expr});`)() };
}

/** The text of the one source line `pattern` matches (its first group), for a copy that is an expression over names. */
export function privateText(file, pattern) {
  const hits = [...source(file).matchAll(new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`))];
  assert.equal(hits.length, 1, `${file}: expected one match of ${pattern}, found ${hits.length}`);
  return hits[0][1];
}

export const AXES = ['nozzle', 'bed', 'chamber'];
