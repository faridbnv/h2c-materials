// WP-32: checks:register -- --cutover-ready. Every old check has a successor with proof, or the owner's recorded approval to retire it; what is
// missing is reported, and no approval is ever invented. The cases change a scratch copy of the checkout and expect the report to say so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../../remake/tools/rulings-check.mjs';
import { csvLine } from '../../remake/tools/wp-lib.mjs';
import { REGISTER_PATH, cutoverReady, retireApprovals } from '../../remake/tools/checks-register.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tool = join(repo, 'remake/tools/checks-register.mjs');

/** A scratch checkout: every top-level entry links to the real one, except the paths named in `copy`, which are real copies. */
function scratch(copy) {
  const dir = mkdtempSync(join(tmpdir(), 'cutover-ready-'));
  for (const name of readdirSync(repo)) if (name !== '.git') symlinkSync(join(repo, name), join(dir, name));
  for (const rel of copy) {
    const parts = rel.split('/');
    for (let i = 1; i < parts.length; i++) {
      const at = join(dir, ...parts.slice(0, i));
      if (lstatSync(at).isSymbolicLink()) {
        const real = readlinkSync(at);
        unlinkSync(at);
        mkdirSync(at);
        for (const child of readdirSync(real)) symlinkSync(join(real, child), join(at, child));
      }
    }
    const target = join(dir, rel);
    if (lstatSync(target).isSymbolicLink()) unlinkSync(target);
    cpSync(join(repo, rel), target, { recursive: true });
  }
  return dir;
}
const COPY = ['checks', 'remake/attest.csv', 'remake/status'];
const withScratch = (fn) => { const dir = scratch(COPY); try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); } };
const approve = (dir, id) => appendFileSync(join(dir, 'remake/attest.csv'), `2026-11-05,retire-approved,${id},wp:attest\n`);
const allDone = (dir) => {
  for (const f of readdirSync(join(dir, 'remake/status'))) {
    const p = join(dir, 'remake/status', f);
    const s = JSON.parse(readFileSync(p, 'utf8'));
    writeFileSync(p, JSON.stringify({ ...s, status: s.status === 'dropped' ? 'dropped' : 'done' }));
  }
};
const editRegister = (dir, fn) => {
  const [header, ...rows] = parseCsv(readFileSync(join(dir, REGISTER_PATH), 'utf8'));
  const objects = rows.filter((r) => r.length === header.length).map((r) => Object.fromEntries(header.map((c, i) => [c, r[i]])));
  writeFileSync(join(dir, REGISTER_PATH), [csvLine(header), ...fn(objects).map((o) => csvLine(header.map((c) => o[c])))].join('\n') + '\n');
};
const ids = (report) => report.missing.map((m) => m.id);

test('today the register is not cutover-ready, and the report says what stands in the way and what only the owner can record', () => {
  const r = cutoverReady(repo);
  assert.deepEqual(r.problems, [], 'the register itself is sound');
  assert.ok(r.missing.length > 0);
  const obsolete = r.missing.filter((m) => m.status === 'obsolete-at-cutover');
  assert.ok(obsolete.length >= 8, 'the checks the plan retires at the cutover wait for the owner');
  for (const m of obsolete) assert.equal(m.fix, `npm run wp:attest -- retire-approved ${m.id}`, 'the owner\'s command for each; this tool never records one');
  assert.ok(r.missing.every((m) => m.id && m.what));
  assert.equal(retireApprovals(repo).size, 0, 'no approval exists in the repository: none was invented');
});

test('an obsolete check is ready only when the owner\'s retire-approved row names it, or says all', () => {
  withScratch((dir) => {
    allDone(dir);
    const before = ids(cutoverReady(dir));
    assert.ok(before.includes('T-frozen') && before.includes('J-pages-single-html'));
    approve(dir, 'T-frozen');
    const one = ids(cutoverReady(dir));
    assert.ok(!one.includes('T-frozen') && one.includes('T-round-close'), 'one approval clears one row');
    approve(dir, 'all');
    assert.deepEqual(cutoverReady(dir).missing, []);
  });
});

test('a check that lives in verify.yml or pages.yml needs a successor job in next-main.yml or next-verify.yml, and it must exist', () => {
  withScratch((dir) => {
    allDone(dir);
    approve(dir, 'all');
    assert.deepEqual(cutoverReady(dir).missing, [], 'with every owner done and every retirement approved, the register is ready');
    editRegister(dir, (rows) => rows.map((r) => (r.id === 'J-verify-trend' ? { ...r, successor_refs: '' } : r)));
    const lost = cutoverReady(dir).missing;
    assert.deepEqual(ids({ missing: lost }), ['J-verify-trend']);
    assert.match(lost[0].what, /verify\.yml or pages\.yml, which the cutover replaces, and names no successor job/);
    // a successor that is named but does not exist is a register problem, not a pass
    editRegister(dir, (rows) => rows.map((r) => (r.id === 'J-verify-trend' ? { ...r, successor_refs: 'ci:next-main.yml/no-such-job' } : r)));
    const r = cutoverReady(dir);
    assert.ok(r.problems.some((p) => /its successor ci:next-main\.yml\/no-such-job does not exist/.test(p)));
    // a successor in a workflow that is not one of the two that stay does not count
    editRegister(dir, (rows) => rows.map((r2) => (r2.id === 'J-verify-trend' ? { ...r2, successor_refs: 'ci:next-preview.yml/build' } : r2)));
    assert.deepEqual(ids(cutoverReady(dir)), ['J-verify-trend']);
  });
});

test('a re-point or successor row waits for the work packages that own its successor', () => {
  withScratch((dir) => {
    allDone(dir);
    approve(dir, 'all');
    const row = (id) => {
      const [header, ...rows] = parseCsv(readFileSync(join(dir, REGISTER_PATH), 'utf8'));
      return Object.fromEntries(header.map((c, i) => [c, rows.find((r) => r[0] === id)[i]]));
    };
    const owner = row('S-context-audit').owner.split(/[;,]/)[0].trim();
    const statusFile = join(dir, 'remake/status', `${owner}.json`);
    writeFileSync(statusFile, JSON.stringify({ ...JSON.parse(readFileSync(statusFile, 'utf8')), status: 'todo' }));
    const missing = cutoverReady(dir).missing;
    assert.ok(missing.some((m) => m.id === 'S-context-audit' && new RegExp(`owned by ${owner}, which is todo`).test(m.what)));
    // the clean-up after the cutover (M5) is not required to be done
    const m5 = JSON.parse(readFileSync(join(repo, 'remake/plan/wp-index.json'), 'utf8')).packages.filter((p) => p.milestone === 'M5').map((p) => p.id);
    assert.ok(m5.includes('WP-38'));
    writeFileSync(join(dir, 'remake/status/WP-38.json'), JSON.stringify({ ...JSON.parse(readFileSync(join(dir, 'remake/status/WP-38.json'), 'utf8')), status: 'todo' }));
    assert.ok(!cutoverReady(dir).missing.some((m) => /WP-38/.test(m.what)));
  });
});

test('CLI: exit 1 and the owner\'s command per missing approval today; exit 0 when the scratch register is ready', () => {
  const bad = spawnSync(process.execPath, [tool, '--cutover-ready'], { cwd: repo, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /NOT cutover-ready: 0 register problem\(s\), \d+ row\(s\) without a proved successor or an approval to retire, of \d+/);
  assert.match(bad.stderr, /the owner runs: npm run wp:attest -- retire-approved T-frozen/);
  withScratch((dir) => {
    allDone(dir);
    approve(dir, 'all');
    const ok = spawnSync(process.execPath, [tool, '--cutover-ready', '--root', dir], { cwd: repo, encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /cutover-ready: all \d+ register rows have a successor with proof or the owner's approval to retire/);
  });
  assert.equal(spawnSync(process.execPath, [tool, '--cutover-ready', '--verify'], { cwd: repo, encoding: 'utf8' }).status, 2);
});
