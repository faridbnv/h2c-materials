#!/usr/bin/env node
// What a change did to the compiled database. Builds a git revision (HEAD by default) in a temporary worktree, builds
// the working tree here, and prints every difference between the two dist/db.json files by path (meta.build excluded).
// A structural change (code moved, a column retyped, a table split) must show no difference; a change of behaviour
// shows exactly the paths it meant to move, and the output belongs in its commit message.
//
//   npm run build:diff                     the working tree against HEAD, grouped by path shape
//   npm run build:diff -- --ref <rev>      against another revision
//   npm run build:diff -- --full           every difference with its before and after value
//   npm run build:diff -- --expect 0       exit 1 unless there are exactly that many differences

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffJson } from './data/db-diff.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : def; };
const ref = arg('ref', 'HEAD');
const expect = arg('expect', null);
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

function buildAt(dir, label) {
  try {
    run(process.execPath, ['build/src/index.js'], dir);
  } catch (e) {
    console.error(`The build of ${label} failed:\n${(e.stdout ?? '').split('\n').filter((l) => /ERROR|failed/.test(l)).slice(0, 20).join('\n')}${e.stderr ?? ''}`);
    process.exit(2);
  }
  const db = JSON.parse(readFileSync(join(dir, 'dist/db.json'), 'utf8'));
  delete db.meta?.build;
  return db;
}

const tmp = mkdtempSync(join(tmpdir(), 'h2c-build-diff-'));
let before;
try {
  run('git', ['worktree', 'add', '--detach', tmp, ref], root);
  if (existsSync(join(root, 'build/node_modules'))) symlinkSync(join(root, 'build/node_modules'), join(tmp, 'build/node_modules'), 'dir');
  before = buildAt(tmp, ref);
} finally {
  try { run('git', ['worktree', 'remove', '--force', tmp], root); } catch { rmSync(tmp, { recursive: true, force: true }); }
}
const after = buildAt(root, 'the working tree');

const diffs = diffJson(before, after, 'db');
const short = (v) => { const s = JSON.stringify(v); return s && s.length > 140 ? `${s.slice(0, 137)}...` : s; };
if (process.argv.includes('--full')) {
  for (const d of diffs) console.log(`${d.path}\n  before ${short(d.before)}\n  after  ${short(d.after)}`);
} else {
  const groups = new Map();
  for (const d of diffs) { const k = d.path.replace(/\[[^\]]+\]/g, '[]'); groups.set(k, (groups.get(k) ?? 0) + 1); }
  for (const [k, n] of [...groups].sort((p, q) => q[1] - p[1])) console.log(`${String(n).padStart(6)}  ${k}`);
}
console.log(`${diffs.length} difference(s) between ${ref} and the working tree`);
if (expect != null && diffs.length !== Number(expect)) { console.error(`expected ${expect}`); process.exit(1); }
