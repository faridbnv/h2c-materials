// remake/tools/custody-copy.sh: the owner's second copy of the private store, and the proof it matches.
// The script is for the owner to run on the real store. These tests run it only on throwaway folders made here, with the
// environment replaced (the real H2C_SOURCE_BACKUP and HOME are never passed on), and they check what it promises:
// tri-state result, nothing deleted or overwritten, a difference reported and not repaired.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = join(root, 'remake/tools/custody-copy.sh');

const made = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'h2c-custody-')); made.push(d); return d; };
test.after(() => { for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* a test left a folder unreadable on purpose */ } } });

/** A throwaway store, an empty destination and a home for the manifests. */
function world() {
  const base = tmp();
  const src = join(base, 'store'), dst = join(base, 'copy'), home = join(base, 'home');
  for (const d of [src, dst, home]) mkdirSync(d);
  mkdirSync(join(src, 'sources/by-sha'), { recursive: true });
  mkdirSync(join(src, 'a folder with spaces'));
  writeFileSync(join(src, 'sources/by-sha/aaaa.pdf'), '%PDF-1.4 one');
  writeFileSync(join(src, 'sources/by-sha/bbbb.html'), '<html>two</html>');
  writeFileSync(join(src, 'a folder with spaces/odd name (1).txt'), 'three');
  writeFileSync(join(src, 'top.csv'), 'a,b\n1,2\n');
  symlinkSync('top.csv', join(src, 'link-to-top'));
  return { base, src, dst, home };
}
/** The script, run with an environment made here. `env` overrides; a key set to null is left out. */
function run(w, args, env = {}) {
  const full = { PATH: process.env.PATH, HOME: w.home, H2C_SOURCE_BACKUP: w.src, H2C_CUSTODY_ALLOW_SAME_VOLUME: '1', H2C_CUSTODY_MANIFESTS: join(w.home, 'manifests'), ...env };
  for (const [k, v] of Object.entries(full)) if (v === null) delete full[k];
  const r = spawnSync('bash', [script, ...args], { encoding: 'utf8', env: full });
  return { status: r.status, out: r.stdout + r.stderr, last: (r.stdout.trim().split('\n').at(-1) ?? '') };
}
/** Every file and link of a folder with its content, for "nothing changed". */
function snapshot(dir, prefix = '') {
  const out = {};
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name), rel = `${prefix}${name}`;
    const st = lstatSync(p);
    if (st.isSymbolicLink()) out[rel] = 'link';
    else if (st.isDirectory()) Object.assign(out, snapshot(p, `${rel}/`));
    else out[rel] = readFileSync(p, 'utf8');
  }
  return out;
}

test('the script is valid bash and holds no command that deletes, moves or overwrites', () => {
  assert.equal(spawnSync('bash', ['-n', script]).status, 0);
  const code = readFileSync(script, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#')).join('\n').replace(/#[^\n'"]*$/gm, '');
  for (const word of ['rm', 'mv', 'rmdir', 'shred', 'unlink', 'truncate', 'dd', 'cp', 'tee']) assert.doesNotMatch(code, new RegExp(`(^|[\\s;&|(])${word}\\s`), `uses ${word}`);
  assert.doesNotMatch(code, /--delete|--remove-source|--force|--inplace|>>?\s*"\$(SRC|DST|DEST_ARG)/);
  assert.match(code, /rsync -a --ignore-existing "\$SRC"\/ "\$DST"\//);
});

test('not-run, exit 2, nothing copied: no store, a store that is not a folder or is empty, no destination, a destination inside or around the store, the same volume', () => {
  const cases = [
    ['H2C_SOURCE_BACKUP unset', (w) => run(w, [w.dst], { H2C_SOURCE_BACKUP: null }), /H2C_SOURCE_BACKUP is not set/],
    ['store is not a folder', (w) => run(w, [w.dst], { H2C_SOURCE_BACKUP: join(w.base, 'nope') }), /is not a folder/],
    ['store is empty', (w) => { const e = join(w.base, 'empty'); mkdirSync(e); return run(w, [w.dst], { H2C_SOURCE_BACKUP: e }); }, /is empty/],
    ['no destination argument', (w) => run(w, []), /usage/],
    ['an option for a destination', (w) => run(w, ['--delete']), /usage/],
    ['destination missing (drive not plugged in)', (w) => run(w, [join(w.base, 'Volumes-drive')]), /not an existing folder/],
    ['destination inside the store', (w) => { const d = join(w.src, 'inside'); mkdirSync(d); return run(w, [d]); }, /inside the store/],
    ['destination contains the store', (w) => run(w, [w.base]), /contains the store/],
    ['same volume without the override', (w) => run(w, [w.dst], { H2C_CUSTODY_ALLOW_SAME_VOLUME: null }), /same volume/],
  ];
  for (const [what, go, re] of cases) {
    const w = world();
    const before = snapshot(w.src);
    const r = go(w);
    assert.equal(r.status, 2, `${what}: ${r.out}`);
    assert.match(r.last, /^custody-copy: not-run: /, what);
    assert.match(r.out, re, what);
    assert.deepEqual(readdirSync(w.dst), [], `${what}: nothing was copied`);
    assert.deepEqual(snapshot(w.src), before, `${what}: the store is untouched`);
  }
});

test('ok, exit 0: the whole store is copied, links included, the manifests match, and the store is untouched', () => {
  const w = world();
  const before = snapshot(w.src);
  const r = run(w, [w.dst]);
  assert.equal(r.status, 0, r.out);
  assert.equal(r.last, 'custody-copy: ok');
  assert.match(r.out, /files and links in the store: 5\nfiles and links in the copy:  5\nmissing in the copy: 0\ndiffering in the copy: 0\nonly in the copy \(kept\): 0/);
  assert.deepEqual(snapshot(w.dst), before, 'the copy holds every file');
  assert.equal(lstatSync(join(w.dst, 'link-to-top')).isSymbolicLink(), true);
  assert.deepEqual(snapshot(w.src), before, 'the store is untouched');
  const stamps = readdirSync(join(w.home, 'manifests'));
  assert.equal(stamps.length, 1);
  const manifest = readFileSync(join(w.home, 'manifests', stamps[0], 'store.sha256'), 'utf8');
  assert.match(manifest, /^[0-9a-f]{64} {2}\.\/a folder with spaces\/odd name \(1\)\.txt$/m);
  assert.match(manifest, /^link {2}\.\/link-to-top -> top\.csv$/m);
  assert.equal(manifest, readFileSync(join(w.home, 'manifests', stamps[0], 'copy.sha256'), 'utf8'));
  assert.ok(!existsSync(join(w.src, '.h2c-custody')) && !existsSync(join(w.dst, '.h2c-custody')), 'no manifest inside either folder');
});

test('a second run is ok and changes nothing; a file only the copy holds is reported and kept, and does not fail', () => {
  const w = world();
  assert.equal(run(w, [w.dst]).status, 0);
  writeFileSync(join(w.dst, 'only-here.txt'), 'kept');
  const r = run(w, [w.dst]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /only in the copy \(kept\): 1/);
  assert.equal(readFileSync(join(w.dst, 'only-here.txt'), 'utf8'), 'kept');
});

test('FAIL, exit 1: a file that differs in the copy is reported and NOT overwritten, whichever copy is the good one', () => {
  const w = world();
  assert.equal(run(w, [w.dst]).status, 0);
  writeFileSync(join(w.dst, 'top.csv'), 'a,b\n9,9\n');
  const before = { src: snapshot(w.src), dst: snapshot(w.dst) };
  const r = run(w, [w.dst]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.last, /^custody-copy: FAIL: /);
  assert.match(r.out, /differs in the copy: \.\/top\.csv/);
  assert.match(r.out, /differing in the copy: 1/);
  assert.deepEqual(snapshot(w.dst), before.dst, 'the differing file was left as it was');
  assert.deepEqual(snapshot(w.src), before.src);
});

test('--verify-only copies nothing: a file missing from the copy fails, and a normal run then adds it', () => {
  const w = world();
  writeFileSync(join(w.dst, 'top.csv'), 'a,b\n1,2\n');
  const r = run(w, ['--verify-only', w.dst]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /missing in the copy: \.\/sources\/by-sha\/aaaa\.pdf/);
  assert.ok(!existsSync(join(w.dst, 'sources')), 'verify-only copied nothing');
  assert.equal(run(w, [w.dst]).status, 0);
  assert.deepEqual(snapshot(w.dst), snapshot(w.src));
  assert.equal(run(w, ['--verify-only', w.dst]).last, 'custody-copy: ok');
});

test('a file that cannot be read is a FAIL, never an ok that skipped it', { skip: process.getuid?.() === 0 && 'root can read every file' }, () => {
  const w = world();
  const hidden = join(w.src, 'top.csv');
  chmodSync(hidden, 0o000);
  try {
    const r = run(w, [w.dst]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.last, /^custody-copy: FAIL/);
    assert.doesNotMatch(r.out, /custody-copy: ok/);
  } finally { chmodSync(hidden, 0o644); }
});
