// M4 close: the candidate receipt is made on CI. A branch-only workflow cannot be dispatched, so it is started by a push that changes
// remake/control/receipt.json. The decision (planReceipt) is judged without GitHub; the workflow is judged as text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECEIPT_REQUEST_PATH, planReceipt, validateReceiptRequest } from '../../remake/tools/receipt-request.mjs';
import { DRY_RUN_BRANCH, isControlChange, planRun } from '../../remake/tools/cutover.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHA = 'a'.repeat(40);

test('the request: null asks for nothing, a 40-hex commit asks for its receipt, anything else is a refusal', () => {
  assert.equal(validateReceiptRequest({ schema: 1, sha: null }), null);
  assert.equal(validateReceiptRequest({ schema: 1, sha: SHA, $comment: 'x' }), SHA);
  for (const bad of [null, [], {}, { schema: 2, sha: SHA }, { schema: 1 }, { schema: 1, sha: 'abc123' }, { schema: 1, sha: SHA.toUpperCase() }, { schema: 1, sha: SHA, extra: 1 }]) assert.throws(() => validateReceiptRequest(bad), /receipt\.json/, JSON.stringify(bad));
});

test('the plan: a request runs only for an ancestor of the pushed commit; null, a missing or malformed file never run', () => {
  const ancestor = (yes) => (sha) => { assert.equal(sha, SHA); return yes; };
  assert.deepEqual(planReceipt({ text: JSON.stringify({ schema: 1, sha: SHA }), isAncestor: ancestor(true) }), { run: true, sha: SHA, refused: false, reason: 'make the receipt of aaaaaaaa' });
  const outside = planReceipt({ text: JSON.stringify({ schema: 1, sha: SHA }), isAncestor: ancestor(false) });
  assert.deepEqual([outside.run, outside.refused], [false, true]);
  assert.match(outside.reason, /not an ancestor of the pushed commit/);
  const none = planReceipt({ text: JSON.stringify({ schema: 1, sha: null }), isAncestor: () => assert.fail('no ancestry question for no request') });
  assert.deepEqual([none.run, none.refused, none.sha], [false, false, null]);
  for (const text of [null, '{not json', '[]']) { const p = planReceipt({ text, isAncestor: () => true }); assert.deepEqual([p.run, p.refused], [false, true], String(text)); }
});

test('the CLI asks git about ancestry and writes the outputs the workflow reads', () => {
  const dir = mkdtempSync(join(tmpdir(), 'receipt-'));
  const git = (...a) => { const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', ...a], { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return r.stdout.trim(); };
  git('init', '-q', '-b', 'trunk');
  writeFileSync(join(dir, 'f'), '1');
  git('add', '-A'); git('commit', '-q', '-m', 'a');
  const a = git('rev-parse', 'HEAD');
  git('checkout', '-q', '-b', 'side');
  writeFileSync(join(dir, 'g'), '1');
  git('add', '-A'); git('commit', '-q', '-m', 'side');
  const side = git('rev-parse', 'HEAD');
  git('checkout', '-q', 'trunk');
  mkdirSync(join(dir, 'remake/control'), { recursive: true });
  const run = (sha, push) => {
    writeFileSync(join(dir, RECEIPT_REQUEST_PATH), JSON.stringify({ schema: 1, sha }));
    const out = join(dir, 'out.txt');
    writeFileSync(out, '');
    const r = spawnSync(process.execPath, [join(root, 'remake/tools/receipt-request.mjs'), 'plan'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, H2C_WP_ROOT: dir, PUSH_SHA: push, GITHUB_OUTPUT: out } });
    return { status: r.status, out: readFileSync(out, 'utf8'), stderr: r.stderr };
  };
  writeFileSync(join(dir, RECEIPT_REQUEST_PATH), JSON.stringify({ schema: 1, sha: null }));
  git('add', '-A'); git('commit', '-q', '-m', 'control');
  const tip = git('rev-parse', 'HEAD');
  assert.deepEqual([run(a, tip).status, run(a, tip).out], [0, `run=true\nsha=${a}\n`]);
  const off = run(side, tip);
  assert.equal(off.status, 1);
  assert.equal(off.out, 'run=false\nsha=\n');
  assert.match(off.stderr, /not an ancestor/);
  assert.deepEqual([run(null, tip).status, run(null, tip).out], [0, 'run=false\nsha=\n']);
});

test('the receipt request is not a restore request: next-main.yml does not read a change of it as a control change', () => {
  assert.equal(isControlChange('remake/control/receipt.json'), false);
  assert.equal(isControlChange('remake/control/restore.json'), true);
  assert.equal(isControlChange('remake/control/rehearsal-ping.json'), true);
  const dir = mkdtempSync(join(tmpdir(), 'cutover-'));
  mkdirSync(join(dir, 'remake/control'), { recursive: true });
  writeFileSync(join(dir, 'remake/control/restore.json'), JSON.stringify({ schema: 1, request: null }));
  writeFileSync(join(dir, 'remake/attest.csv'), 'date,key,detail,source\n');
  const only = planRun({ event: 'push', ref: DRY_RUN_BRANCH, sha: SHA, hold: '', changedFiles: ['remake/control/receipt.json'], root: dir, isAncestor: () => false });
  assert.deepEqual([only.run, only.refused, only.deploy], [false, false, false]);
  const both = planRun({ event: 'push', ref: DRY_RUN_BRANCH, sha: SHA, hold: '', changedFiles: ['remake/control/receipt.json', 'remake/control/rehearsal-ping.json'], root: dir, isAncestor: () => false });
  assert.equal(both.run, true);
});

test('the committed request is empty (null) until someone asks', () => {
  assert.equal(validateReceiptRequest(JSON.parse(readFileSync(join(root, RECEIPT_REQUEST_PATH), 'utf8'))), null);
});

// ---- the workflow, as text -------------------------------------------------------------------------------------------------------------
const raw = readFileSync(join(root, '.github/workflows/candidate-receipt.yml'), 'utf8');
const text = raw.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
const jobBlock = (id) => {
  const m = new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm').exec(text);
  assert.ok(m, `job ${id}`);
  return m[1];
};

test('candidate-receipt.yml starts on a push to remake/v3 that changes only the request, on the pinned image and Node, with no secret', () => {
  assert.match(text, /on:\n  push:\n    branches: \[remake\/v3\]\n    paths: \['remake\/control\/receipt\.json'\]\n/);
  assert.doesNotMatch(text, /pull_request|workflow_dispatch|schedule:/);
  assert.doesNotMatch(text, /secrets\./);
  assert.doesNotMatch(text, /environment:/);
  assert.doesNotMatch(text, /ubuntu-latest/);
  assert.equal((text.match(/runs-on: ubuntu-24\.04/g) ?? []).length, 3);
  assert.equal((text.match(/^    timeout-minutes:/gm) ?? []).length, 3, 'a timeout on every job');
  assert.match(jobBlock('receipt'), /timeout-minutes: 180/);
  assert.match(jobBlock('receipt'), /node-version-file: \.nvmrc/);
  for (const u of [...text.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((m) => m[1])) assert.match(u, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, u);
});

test('it checks out the candidate, installs and builds, installs Chromium, and makes the receipt with the records of the pushed commit', () => {
  const receipt = jobBlock('receipt');
  assert.match(receipt, /fetch-depth: 0/);
  assert.match(receipt, /git checkout --detach "\$CANDIDATE"/);
  assert.match(receipt, /npm ci\n\s+npm ci --prefix build/);
  assert.match(receipt, /run: npm run build/);
  assert.match(receipt, /npx playwright install chromium --with-deps/);
  assert.match(receipt, /npm run candidate:receipt -- "\$CANDIDATE" --records-ref "\$RECORDS_FROM"/);
  assert.match(receipt, /RECORDS_FROM: \$\{\{ github\.sha \}\}/);
  assert.match(receipt, /actions\/upload-artifact@/);
  assert.match(jobBlock('plan'), /node remake\/tools\/receipt-request\.mjs plan/);
  assert.match(receipt, /if: needs\.plan\.outputs\.run == 'true'/);
});

test('only the last job may write, and no expression reaches a shell: the requested commit travels through env', () => {
  assert.match(text, /^permissions:\n  contents: read$/m);
  assert.equal((text.match(/contents: write/g) ?? []).length, 1);
  assert.match(jobBlock('publish'), /permissions:\n      contents: write/);
  assert.doesNotMatch(jobBlock('plan'), /contents: write/);
  assert.doesNotMatch(jobBlock('receipt'), /contents: write/);
  assert.doesNotMatch(jobBlock('publish'), /\bnpm\b|\bnode\b|\bnpx\b/, 'the job that can write runs no repository code');
  // every `run:` block, with its lines: no ${{ }}
  const runs = [...text.matchAll(/^(?: {8}|      - )run: (?:\|\n((?: {10,}.*\n?)+)|(.*))$/gm)].map((m) => m[1] ?? m[2]);
  assert.ok(runs.length >= 8);
  for (const r of runs) assert.doesNotMatch(r, /\$\{\{/, r);
  assert.match(jobBlock('publish'), /branch="records\/receipt-\$\{short\}"/);
  assert.match(jobBlock('publish'), /git push origin "HEAD:refs\/heads\/\$\{branch\}"/);
  assert.doesNotMatch(text, /--force|push -f|remake\/v3 *$/m, 'no force push, and never a push to remake/v3');
});
