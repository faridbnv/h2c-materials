// Exercise the actual checker in disposable copies: stale prose and false task closure must fail without writes.
import { cpSync, mkdtempSync, mkdirSync, symlinkSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [rootArg, out] = process.argv.slice(2), root = resolve(rootArg), audit = 'docs/audits/2026-09-30-coverage-expansion';
const hash = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const protectedFiles = ['data/manifest.json', audit + '/STATUS.md', audit + '/completed-outcomes.json'];
const before = protectedFiles.map(p => hash(join(root, p)));
mkdirSync(join(root, '.cache'), { recursive: true });
const dir = mkdtempSync(join(root, '.cache/coverage-doc-fixture-')), results = [];
try {
  for (const name of ['app', 'build', 'data', 'schema']) symlinkSync(join(root, name), join(dir, name), 'dir');
  mkdirSync(join(dir, 'dist')); cpSync(join(root, 'dist/db.json'), join(dir, 'dist/db.json'));
  mkdirSync(join(dir, 'scripts/audit'), { recursive: true });
  cpSync(join(root, 'scripts/audit/coverage-campaign-status.mjs'), join(dir, 'scripts/audit/coverage-campaign-status.mjs'));
  symlinkSync(join(root, 'scripts/data'), join(dir, 'scripts/data'), 'dir');
  cpSync(join(root, audit), join(dir, audit), { recursive: true });
  cpSync(join(root, 'package.json'), join(dir, 'package.json'));
  const run = () => spawnSync(process.execPath, ['scripts/audit/coverage-campaign-status.mjs', '--check'], { cwd: dir, encoding: 'utf8' });
  const outcomeFile = join(dir, audit, 'completed-outcomes.json'), original = readFileSync(outcomeFile);
  const refuse = label => { const r = run(); assert.notEqual(r.status, 0, label); results.push({ case: label, rejected: true }); };
  let r = run(); assert.equal(r.status, 0, r.stderr); results.push({ case: 'Current generated status passes', passed: true });
  const md = join(dir, audit, 'STATUS.md'), bytes = readFileSync(md); writeFileSync(md, 'Stale status');
  refuse('Stale status is rejected'); assert.equal(readFileSync(md, 'utf8'), 'Stale status'); writeFileSync(md, bytes);
  let d = JSON.parse(original); d.Outcomes.push(d.Outcomes[0]); writeFileSync(outcomeFile, JSON.stringify(d));
  refuse('Duplicate target cannot inflate completion'); writeFileSync(outcomeFile, original);
  d = JSON.parse(original); d.Outcomes.push({ ...d.Outcomes[0], TaskID: 'PROD-G-NOT-IN-FROZEN-SCOPE' }); writeFileSync(outcomeFile, JSON.stringify(d));
  refuse('Out-of-scope closure cannot inflate completion'); writeFileSync(outcomeFile, original);
  const packet = join(dir, audit, d.Outcomes[0].Packet + '-packet.json'); writeFileSync(packet, Buffer.concat([readFileSync(packet), Buffer.from(' ')]));
  refuse('Packet no longer pinned by its approved review is rejected');
  assert.deepEqual(protectedFiles.map(p => hash(join(root, p))), before, 'Root data/status changed');
  writeFileSync(out, JSON.stringify({ cases: results.length, results, rootDataAndStatusUnchanged: true, checkerWritesNothingInCheckMode: true }, null, 2) + '\n');
  console.log(JSON.stringify({ cases: results.length, passed: true }));
} finally { rmSync(dir, { recursive: true, force: true }); }
