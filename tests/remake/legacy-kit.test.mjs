// WP-35: the saved old site (legacy-site.mjs, save-legacy.sh) and the rollback rehearsal driver (rehearse.mjs). The script runs in its
// fixture mode (no network, no build); the driver runs against a scripted world with a fake clock. Neither creates a release or touches a
// repository variable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NOT_SERVED, assertManifest, buildManifest, compareWithLive, crawl, fetchPaths, formatReport, knownNames, packZip, sha256, verifyFolder, zipNames } from '../../remake/tools/legacy-site.mjs';
import { HOLD_VALUE, PHASES, rehearse, stepsFor } from '../../remake/tools/rehearse.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SHA = 'a'.repeat(40);
const OLD_ID = '7c6da496722d';
const STAMPED = `H2C_Material_Selector_2026-09-21_${OLD_ID}.html`;
const tmp = (n) => mkdtempSync(join(tmpdir(), `${n}-`));
const writeSite = (dir, files) => { for (const [p, c] of Object.entries(files)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); } return dir; };
const PAGE = (b) => `<!doctype html><html><head></head><body>${b}</body></html>`;
const siteFiles = () => ({ 'index.html': PAGE('selector'), [STAMPED]: PAGE('selector'), 'manifest.json': JSON.stringify({ release: OLD_ID }), 'materials/M001.html': PAGE('pla') });

// ---- the manifest and the comparison ---------------------------------------------------------------------------------------------
test('the manifest lists every file with bytes and sha256, sorted, and names the old release from the stamped selector page', () => {
  const dir = writeSite(tmp('site'), siteFiles());
  const m = buildManifest(dir, { mainCommit: SHA });
  assert.equal(m.oldReleaseId, OLD_ID);
  assert.equal(m.fileCount, 4);
  assert.deepEqual(m.files.map((f) => f.path), [...m.files.map((f) => f.path)].sort());
  assert.equal(m.files.find((f) => f.path === 'index.html').sha256, sha256(readFileSync(join(dir, 'index.html'))));
  assert.deepEqual(buildManifest(dir, { mainCommit: SHA }), m, 'the same bytes give the same manifest');
  assert.throws(() => buildManifest(dir, { mainCommit: 'abc' }), /40 hex/);
  assert.throws(() => buildManifest(tmp('empty'), { mainCommit: SHA }), /holds no files/);
  assert.throws(() => buildManifest(writeSite(tmp('nostamp'), { 'index.html': 'x' }), { mainCommit: SHA }), /no release-stamped selector page/);
  assert.equal(assertManifest(m), m);
  for (const bad of [{ ...m, files: [{ ...m.files[0], path: '../x' }] }, { ...m, files: [m.files[0], m.files[0]] }, { ...m, files: [{ ...m.files[0], sha256: 'x' }] }, { ...m, kind: 'other' }]) assert.throws(() => assertManifest(bad));
  assert.deepEqual(verifyFolder(dir, m), { missing: [], extra: [], different: [], ok: true });
  writeFileSync(join(dir, 'index.html'), 'changed');
  writeFileSync(join(dir, 'new.html'), 'n');
  const v = verifyFolder(dir, m);
  assert.deepEqual([v.different, v.extra, v.ok], [['index.html'], ['new.html'], false]);
});

test('the comparison with the live site explains a difference only by evidence, and the live bytes are what is stored when they differ', () => {
  const dir = writeSite(tmp('site'), { ...siteFiles(), '.nojekyll': '' });
  const m = buildManifest(dir, { mainCommit: SHA });
  const digests = new Map(m.files.filter((f) => !NOT_SERVED.has(f.path)).map((f) => [f.path, f.sha256]));
  const same = compareWithLive(m, digests);
  assert.deepEqual([same.exitCode, same.differing.length, same.identical], [0, 0, 4]);
  // .nojekyll is read by Pages and never served: not a difference
  assert.equal(same.rows.find((r) => r.path === '.nojekyll').kind, 'not-served');
  // a live file with other bytes: explained only when the baseline recorded that very digest for the published asset
  const live = new Map(digests).set(STAMPED, 'e'.repeat(64));
  const unexplained = compareWithLive(m, live, {});
  assert.equal(unexplained.exitCode, 4);
  assert.match(unexplained.differing[0].why, /no recorded digest of the published asset explains it/);
  const explained = compareWithLive(m, live, { [STAMPED]: 'e'.repeat(64) });
  assert.equal(explained.exitCode, 3);
  assert.match(explained.differing[0].why, /equal the digest the baseline receipt recorded.*The live bytes are stored/);
  // a recorded digest for another file does not explain this one
  assert.equal(compareWithLive(m, live, { 'index.html': 'e'.repeat(64) }).exitCode, 4);
  // missing and extra
  const gone = new Map(digests); gone.delete('materials/M001.html');
  assert.equal(compareWithLive(m, gone).differing[0].kind, 'missing-live');
  const extra = new Map(digests).set('surprise.html', 'f'.repeat(64));
  assert.deepEqual(compareWithLive(m, extra).differing.map((r) => [r.path, r.kind, r.explained]), [['surprise.html', 'extra-live', false]]);
  assert.match(formatReport(unexplained, { base: 'https://x/', mainCommit: SHA }), /UNEXPLAINED: live eeeeeeeeeeee against rebuilt/);
  assert.match(formatReport(same, { base: 'https://x/', mainCommit: SHA }), /No differences/);
  assert.match(formatReport(explained, { base: 'https://x/', mainCommit: SHA }), /Every difference is explained/);
});

test('the crawl fetches the manifest\'s paths and the names the baseline knows, writes what the live site served, and treats a 404 as absent but an error as an error', async () => {
  const dir = writeSite(tmp('site'), siteFiles());
  const m = buildManifest(dir, { mainCommit: SHA });
  const served = { ...siteFiles(), [STAMPED]: PAGE('different') };
  const seen = [];
  const fetchFn = async (url) => {
    const p = decodeURIComponent(new URL(url).pathname).replace(/^\/(h2c-materials\/)?/, '');
    seen.push(p);
    if (p === 'boom.html') return { status: 500, arrayBuffer: async () => new ArrayBuffer(0) };
    return p in served ? { status: 200, arrayBuffer: async () => Buffer.from(served[p]) } : { status: 404, arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const out = tmp('live');
  const baseline = { liveRelease: { manifest: { fields: { outputs: { 'db.json': 'x', [STAMPED]: 'y', 'materials/': 'z' } } }, githubAssets: [{ name: STAMPED, digest: `sha256:${sha256(Buffer.from(PAGE('different')))}` }] } };
  assert.deepEqual(knownNames(baseline), ['db.json', STAMPED]);
  const cmp = await crawl({ manifest: m, baseline, base: 'https://pdynamics.ca/h2c-materials/', outDir: out, fetchFn });
  assert.ok(seen.includes('db.json'), 'the names the baseline knows are asked for as well');
  assert.equal(cmp.exitCode, 3, JSON.stringify(cmp.differing));
  assert.equal(readFileSync(join(out, STAMPED), 'utf8'), PAGE('different'), 'the live bytes are what is kept');
  assert.ok(!existsSync(join(out, 'db.json')), 'a 404 writes nothing');
  await assert.rejects(() => fetchPaths(['boom.html'], { base: 'https://x/', fetchFn }), /boom\.html: HTTP 500/);
  // from a folder
  const folder = writeSite(tmp('folder'), siteFiles());
  const got = await fetchPaths(['index.html', 'nope.html'], { fromDir: folder });
  assert.equal(got.get('nope.html'), null);
  assert.ok(got.get('index.html'));
});

test('packing is deterministic for the same files, and listing a zip refuses unsafe names', () => {
  const dir = writeSite(tmp('site'), siteFiles());
  const a = join(tmp('zip'), 'a.zip'), b = join(tmp('zip'), 'b.zip');
  assert.equal(packZip(dir, a), 4);
  packZip(dir, b);
  assert.equal(sha256(readFileSync(a)), sha256(readFileSync(b)));
  assert.deepEqual(zipNames(a).sort(), ['index.html', STAMPED, 'manifest.json', 'materials/M001.html'].sort());
});

// ---- save-legacy.sh in its fixture mode -----------------------------------------------------------------------------------------
const script = join(root, 'remake/tools/save-legacy.sh');
const save = (args) => spawnSync('bash', [script, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env } });
const fixtureSites = (liveFiles = siteFiles()) => ({ site: writeSite(tmp('rebuilt'), siteFiles()), live: writeSite(tmp('live'), liveFiles), out: join(tmp('out'), 'legacy-final') });
const common = (f) => ['--main-commit', SHA, '--site-from', f.site, '--live-from', f.live, '--out', f.out];

test('save-legacy.sh (fixture mode): builds the zip, its manifest and the record, checks the zip the way a restore does, and prints the gh command without running it', () => {
  const f = fixtureSites();
  const r = save(common(f));
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const files = readdirSync(f.out).sort();
  assert.deepEqual(files, ['legacy-diff.md', 'legacy-final.json', 'legacy-manifest.json', `legacy-site-${OLD_ID}.zip`]);
  const rec = JSON.parse(readFileSync(join(f.out, 'legacy-final.json'), 'utf8'));
  assert.equal(rec.asset, `legacy-site-${OLD_ID}.zip`);
  assert.equal(rec.digest, `sha256:${sha256(readFileSync(join(f.out, rec.asset)))}`);
  assert.equal(rec.storedFrom, 'rebuilt');
  assert.equal(rec.mainCommit, SHA);
  assert.match(r.stdout, /dry restore: pass; 4 files matched the manifest; nothing was deployed/);
  assert.match(r.stdout, /gh release create h2c-legacy-final .*--repo faridbnv\/h2c-materials --target a{40}/);
  assert.match(r.stdout, /this script has NOT created anything on GitHub/);
  assert.ok(r.stdout.includes(`"digest":"${rec.digest}"`), 'the restore request for the control file is printed');
  const manifest = JSON.parse(readFileSync(join(f.out, 'legacy-manifest.json'), 'utf8'));
  assert.deepEqual(verifyFolder(f.site, manifest), { missing: [], extra: [], different: [], ok: true });
});

test('save-legacy.sh never creates a release or changes a repository setting: the only `gh release` is printed text', () => {
  const text = readFileSync(script, 'utf8').split('\n');
  const heredoc = text.findIndex((l) => /^cat <<DONE/.test(l));
  assert.ok(heredoc > 0);
  const code = text.slice(0, heredoc).filter((l) => !/^\s*#/.test(l));
  for (const l of code) assert.doesNotMatch(l, /\bgh\b\s+(release|variable|api|secret|repo|workflow)/, l);
  assert.equal(code.filter((l) => /\bgh\b/.test(l) && !/echo|printf|command -v/.test(l)).length, 0);
  assert.match(text.slice(heredoc).join('\n'), /gh release create h2c-legacy-final/);
});

test('save-legacy.sh: an unexplained difference stops with exit 4 and no zip; --store live stores the live bytes after the owner has read the report', () => {
  const f = fixtureSites({ ...siteFiles(), 'materials/M001.html': PAGE('changed after the build') });
  const stopped = save(common(f));
  assert.equal(stopped.status, 4, stopped.stderr);
  assert.match(stopped.stderr, /UNEXPLAINED. Read .*legacy-diff\.md/);
  assert.ok(!readdirSync(f.out).some((n) => n.endsWith('.zip')), 'no zip is made');
  assert.doesNotMatch(stopped.stdout, /gh release create/, 'and no command to upload is printed');
  assert.match(readFileSync(join(f.out, 'legacy-diff.md'), 'utf8'), /materials\/M001\.html \| differs \| UNEXPLAINED/);
  const f2 = fixtureSites({ ...siteFiles(), 'materials/M001.html': PAGE('changed after the build') });
  const forced = save([...common(f2), '--store', 'live']);
  assert.equal(forced.status, 0, forced.stderr + forced.stdout);
  const rec = JSON.parse(readFileSync(join(f2.out, 'legacy-final.json'), 'utf8'));
  assert.equal(rec.storedFrom, 'live');
  const manifest = JSON.parse(readFileSync(join(f2.out, 'legacy-manifest.json'), 'utf8'));
  assert.equal(manifest.files.find((x) => x.path === 'materials/M001.html').sha256, sha256(Buffer.from(PAGE('changed after the build'))), 'the live bytes are in the zip');
  assert.equal(save([...common(f2), '--store', 'rebuilt']).status, 2);
});

test('save-legacy.sh: the fixture mode needs a main commit, an unknown option is refused, and --help prints the plain-words header', () => {
  const f = fixtureSites();
  assert.notEqual(save(['--site-from', f.site, '--live-from', f.live, '--out', f.out]).status, 0);
  assert.equal(save(['--nonsense']).status, 2);
  const h = save(['--help']);
  assert.equal(h.status, 0);
  assert.match(h.stdout, /IT NEVER CREATES THE RELEASE ITSELF/);
});

// ---- the rehearsal driver ------------------------------------------------------------------------------------------------------------
const T0 = Date.parse('2026-11-04T10:00:00Z');
const NEXT_COMMIT = 'c'.repeat(40);
const HOLDTEST_SHA = 'd'.repeat(40);
const RESTORE_SHA = 'e'.repeat(40);

/**
 * A scripted world with a fake clock. `plan` says when things happen (seconds from the start): the owner sets the hold, the held run appears and
 * what its deploy job did, the restore run is created and the preview serves the restore, the candidate is back.
 */
function world(over = {}) {
  const plan = { holdAt: 20, heldRunAt: 60, heldDeploy: 'skipped', restoreRunAt: 100, servedAt: 160, backAt: 300, previewMovesDuringHold: false, ...over };
  let t = 0;
  const iso = (s) => new Date(T0 + s * 1000).toISOString();
  const saves = [];
  const deps = {
    now: () => T0 + t * 1000,
    sleep: async (ms) => { t += ms / 1000; },
    log: () => {},
    fetchJson: async () => {
      if (t >= plan.backAt) return { remakeCommit: NEXT_COMMIT, release: 'r2', builtAt: iso(plan.backAt) };
      if (t >= plan.servedAt) return { remakeCommit: RESTORE_SHA, release: '7c6da496722d', builtAt: iso(plan.servedAt), restoredFrom: `sha256:${'9'.repeat(64)}` };
      if (plan.previewMovesDuringHold && t > plan.heldRunAt) return { remakeCommit: HOLDTEST_SHA, release: 'r', builtAt: iso(70) };
      return { remakeCommit: SHA, release: 'r1', builtAt: iso(0) };
    },
    holdValue: () => (t >= plan.holdAt ? HOLD_VALUE : ''),
    runs: async (workflow) => {
      if (workflow === 'next-preview.yml') return [{ databaseId: 1, headSha: SHA, status: 'completed', conclusion: 'success', createdAt: iso(-100) }];
      const runs = [];
      if (t >= plan.heldRunAt) runs.push({ databaseId: 11, headSha: HOLDTEST_SHA, status: 'completed', conclusion: 'success', createdAt: iso(plan.heldRunAt - 5) });
      if (t >= plan.restoreRunAt) runs.push({ databaseId: 12, headSha: RESTORE_SHA, status: 'completed', conclusion: 'success', createdAt: iso(plan.restoreRunAt) });
      if (t >= plan.backAt) runs.push({ databaseId: 13, headSha: NEXT_COMMIT, status: 'completed', conclusion: 'success', createdAt: iso(plan.backAt - 30) });
      return runs;
    },
    jobs: async (id) => (id === 11 ? [{ name: 'build the site artifact', conclusion: 'success' }, { name: 'deploy the artifact to the preview repository', conclusion: plan.heldDeploy }] : []),
    smoke: async () => ({ status: plan.smoke ?? 'pass', filesChecked: 4, checks: [{ name: 'x', ok: (plan.smoke ?? 'pass') === 'pass' }] }),
  };
  return { deps, saves, plan };
}
const manifestFile = () => {
  const dir = writeSite(tmp('site'), siteFiles());
  const f = join(tmp('m'), 'legacy-manifest.json');
  writeFileSync(f, JSON.stringify(buildManifest(dir, { mainCommit: SHA })));
  return f;
};
const newLog = () => ({ schema: 1, candidate: SHA, startedAt: new Date(T0).toISOString(), phases: [], result: 'running', holdTested: null, restoreSeconds: null });
async function go(over = {}, extra = {}) {
  const w = world(over);
  const log = extra.log ?? newLog();
  const out = await rehearse({ candidate: SHA, manifest: manifestFile(), timeoutS: 600, pollS: 5, log, save: (l) => w.saves.push(JSON.parse(JSON.stringify(l))), ...extra }, w.deps);
  return { out, w };
}

test('the rehearsal logs candidate, hold, hold test, restore, check and candidate again, with timings, and passes when the restore is served in time', async () => {
  const { out, w } = await go();
  assert.equal(out.result, 'pass', out.note);
  assert.deepEqual(out.phases.map((p) => p.name), PHASES);
  assert.ok(out.phases.every((p) => p.result === 'pass' && p.startedAt && p.endedAt && typeof p.seconds === 'number'));
  assert.equal(out.holdTested, true);
  assert.equal(out.restoreSeconds, 60, 'from the request (the run\'s creation, t=100) to the old site being served (t=160)');
  const hold = out.phases.find((p) => p.name === 'hold-test');
  assert.deepEqual([hold.observed.deployJob, hold.observed.buildJob, hold.observed.previewUnchanged], ['skipped', 'success', true]);
  assert.equal(out.phases.find((p) => p.name === 'restore').observed.requestedAt, new Date(T0 + 100_000).toISOString());
  assert.equal(out.phases.find((p) => p.name === 'candidate-again').observed.holdNow, HOLD_VALUE, 'the hold is cleared by the owner, outside this tool: it is only read');
  assert.ok(w.saves.length >= PHASES.length, 'the log is written after every step');
  assert.ok(out.totalSeconds > 0);
});

test('a held run whose deploy job was not skipped fails the rehearsal: the hold did not hold', async () => {
  const { out } = await go({ heldDeploy: 'success' });
  assert.equal(out.result, 'fail');
  assert.match(out.note, /THE HOLD DID NOT HOLD/);
  assert.notEqual(out.holdTested, true);
  assert.equal(out.phases.find((p) => p.name === 'hold-test').result, 'fail');
  assert.ok(!out.phases.some((p) => p.name === 'restore'), 'nothing after a failed hold test runs');
});

test('the preview moving while the hold is set fails the rehearsal even when the deploy job says skipped', async () => {
  const { out } = await go({ previewMovesDuringHold: true });
  assert.equal(out.result, 'fail');
  assert.match(out.note, /the preview moved while the hold was set/);
});

test('a restore served after 15 minutes fails, with the number in the log', async () => {
  const { out } = await go({ servedAt: 100 + 901, backAt: 1500 }, { timeoutS: 3000 });
  assert.equal(out.result, 'fail');
  assert.ok(out.restoreSeconds >= 901 && out.restoreSeconds <= 906, 'served at 901 s, seen at the next poll (5 s): the number is an upper bound by one poll');
  assert.match(out.note, /the restore took 90\d s; the line is 900 s/);
  assert.equal(out.holdTested, true);
});

test('a smoke that fails on the restored preview, a hold nobody sets, and a candidate that never comes back each fail with their reason', async () => {
  assert.match((await go({ smoke: 'fail' })).out.note, /the legacy smoke failed/);
  const never = await go({ holdAt: 1e9 }, { timeoutS: 120 });
  assert.equal(never.out.result, 'fail');
  assert.match(never.out.note, /timed out after 120 s waiting for: the owner to set DEPLOY_HOLD=legacy-final/);
  const stuck = await go({ backAt: 1e9 }, { timeoutS: 200 });
  assert.equal(stuck.out.result, 'fail');
  assert.match(stuck.out.note, /waiting for: the candidate to be deployed to the preview again/);
});

test('--resume skips the steps that passed and keeps their timings', async () => {
  const first = await go({ backAt: 1e9 }, { timeoutS: 200 });
  assert.equal(first.out.result, 'fail');
  const log = JSON.parse(JSON.stringify(first.out));
  log.result = 'running';
  const w = world({ holdAt: 0, heldRunAt: 0, restoreRunAt: 0, servedAt: 0, backAt: 0 });
  const done = log.phases.filter((p) => p.result === 'pass').map((p) => p.name);
  assert.ok(done.includes('restore'));
  const out = await rehearse({ candidate: SHA, manifest: manifestFile(), timeoutS: 600, pollS: 5, log, save: () => {} }, w.deps);
  assert.equal(out.phases.find((p) => p.name === 'restore').observed.requestedAt, first.out.phases.find((p) => p.name === 'restore').observed.requestedAt, 'a passed step is not run again');
});

test('every step names who takes it; the owner takes the hold, and the tool takes no step that changes a repository', () => {
  const steps = stepsFor(SHA);
  assert.deepEqual(Object.keys(steps), PHASES);
  assert.equal(steps.hold.who, 'owner');
  assert.match(steps.hold.do, /gh variable set DEPLOY_HOLD --body legacy-final/);
  const source = readFileSync(join(root, 'remake/tools/rehearse.mjs'), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  assert.doesNotMatch(source, /gh\(\[?'(variable'?,\s*'(set|delete)|release'?,\s*'create|workflow|pr'?,\s*'(merge|create)|api')/);
  assert.doesNotMatch(source, /'(set|delete)'/, 'no variable is set or deleted by the driver');
  const cli = spawnSync(process.execPath, [join(root, 'remake/tools/rehearse.mjs'), 'plan', '--candidate', SHA], { encoding: 'utf8' });
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /1\. candidate.*\n2\. hold \(owner\).*\n3\. hold-test.*\n4\. restore.*\n5\. check.*\n6\. candidate-again/);
  assert.match(cli.stdout, /Nothing was done\./);
  assert.notEqual(spawnSync(process.execPath, [join(root, 'remake/tools/rehearse.mjs'), 'plan', '--candidate', 'abc'], { encoding: 'utf8' }).status, 1000);
  assert.equal(spawnSync(process.execPath, [join(root, 'remake/tools/rehearse.mjs'), 'plan'], { encoding: 'utf8' }).status, 2);
});
