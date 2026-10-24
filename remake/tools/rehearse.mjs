#!/usr/bin/env node
// The rollback rehearsal driver (WP-35; pack 07 section 13.3). Against the PREVIEW only, never the live site. It watches the rehearsal happen,
// asks the right person for each step it may not take itself, and logs every command's result and time:
//
//   1. candidate     the next-preview.yml run of the candidate commit has completed with success (its smoke job was green), and the preview serves it (preview.json)
//   2. hold          the owner has set DEPLOY_HOLD (this tool reads the variable and never sets it)
//   3. hold test     a harmless push (remake/control/rehearsal-ping.json) starts next-main.yml in its dry run: its build runs and its
//                    deploy job is SKIPPED, and the preview does not move
//   4. restore       remake/control/restore.json names the saved zip; next-main.yml restores it; the legacy smoke profile passes against
//                    the preview. The time from the request (the run's creation) to the old site being served is the rehearsal's number
//   5. check         the legacy smoke profile, run here, against the preview, with the saved manifest
//   6. candidate again  the hold and the request are cleared and a push deploys the candidate again; its smoke is green
//
//   node remake/tools/rehearse.mjs run --candidate SHA --manifest FILE [--log FILE] [--timeout-s N] [--poll-s N] [--resume]
//   node remake/tools/rehearse.mjs plan --candidate SHA          prints every step and the exact command for whoever takes it; does nothing
//
// The restore time is seen at the polling interval (--poll-s, 15 s by default), so it is an upper bound by at most one poll.
// A step this tool may not take (setting the variable, merging a pull request into remake/v3) is printed as "ACTION NEEDED" with the exact
// command, and the tool polls until its consequence is visible. Agents may not push to remake/v3 directly: each push here is a pull request
// that merges. The log is remake/rehearsal/<date>.json (written after every step, so a stopped session can --resume). The receipt reads it
// (candidate:check wants result "pass", the restore under 15 minutes, and the hold tested).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';
import { runLegacySmoke } from './legacy-smoke.mjs';
import { REHEARSAL_BUDGET_SECONDS } from './candidate.mjs';

export const PREVIEW_URL = 'https://pdynamics.ca/h2c-material-temp-page/';
export const LIVE_REPO = 'faridbnv/h2c-materials';
export const HOLD_VALUE = 'legacy-final';
export const PHASES = ['candidate', 'hold', 'hold-test', 'restore', 'check', 'candidate-again'];

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

/** The exact words for each step: who takes it and with what. */
export function stepsFor(candidate) {
  return {
    candidate: { who: 'agent', do: `Deploy the candidate ${candidate.slice(0, 8)}: it is the tip of remake/v3, so next-preview.yml has deployed it (merge nothing else until the rehearsal is done).` },
    hold: { who: 'owner', do: `gh variable set DEPLOY_HOLD --body ${HOLD_VALUE} --repo ${LIVE_REPO}` },
    'hold-test': { who: 'agent', do: 'Open a pull request that adds one number to "pings" in remake/control/rehearsal-ping.json and merge it into remake/v3 (agents merge into remake/v3 once checks are green). next-main.yml must verify and build and must NOT deploy.' },
    restore: { who: 'agent', do: 'Open a pull request that puts the restore request into remake/control/restore.json (the JSON save-legacy.sh printed; its digest is in remake/legacy/legacy-final.json) and merge it into remake/v3. The merge is the moment "restore requested".' },
    check: { who: 'tool', do: 'The legacy smoke profile runs here against the preview with the saved manifest.' },
    'candidate-again': { who: 'owner and agent', do: `The owner clears the hold: gh variable delete DEPLOY_HOLD --repo ${LIVE_REPO}. An agent merges a pull request that sets "request" back to null in remake/control/restore.json, which starts a dry run that deploys the candidate again.` },
  };
}

/** The GitHub and network reads, replaceable in tests. */
export function realDeps(root = repoRoot()) {
  const gh = (args) => {
    const r = spawnSync('gh', args, { cwd: root, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`gh ${args.slice(0, 3).join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
    return r.stdout;
  };
  return {
    sleep: sleepMs,
    now: Date.now,
    log: (m) => console.log(m),
    fetchJson: async (url) => { const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, { signal: AbortSignal.timeout(30000) }); if (res.status !== 200) throw new Error(`${url}: HTTP ${res.status}`); return res.json(); },
    holdValue: () => { try { return gh(['variable', 'get', 'DEPLOY_HOLD', '--repo', LIVE_REPO]).trim(); } catch (e) { if (/not found|HTTP 404/i.test(e.message)) return ''; throw e; } },
    runs: (workflow, branch) => JSON.parse(gh(['run', 'list', '--repo', LIVE_REPO, '--workflow', workflow, '--branch', branch, '--limit', '10', '--json', 'databaseId,headSha,status,conclusion,createdAt'])),
    jobs: (id) => JSON.parse(gh(['run', 'view', String(id), '--repo', LIVE_REPO, '--json', 'jobs'])).jobs.map((j) => ({ name: j.name, conclusion: j.conclusion })),
    smoke: (cfg) => runLegacySmoke(cfg),
  };
}

/** Polls `probe()` until it returns a truthy value or the time is up. Returns { value, seconds }. */
async function until(probe, { deps, timeoutS, pollS, what }) {
  const started = deps.now();
  let last;
  for (;;) {
    try { last = await probe(); } catch (e) { last = { error: e.message }; }
    if (last && !last.error) return { value: last, seconds: Math.round((deps.now() - started) / 1000) };
    if (deps.now() - started >= timeoutS * 1000) throw new Error(`timed out after ${timeoutS} s waiting for: ${what}${last?.error ? ` (last: ${last.error})` : ''}`);
    await deps.sleep(pollS * 1000);
  }
}

/** Runs the rehearsal. `deps` replaces GitHub and the network; `log` is the object that is written after each step. */
export async function rehearse({ candidate, manifest, baseUrl = PREVIEW_URL, timeoutS = 1800, pollS = 15, log, save }, deps) {
  if (!/^[0-9a-f]{40}$/.test(candidate)) throw new Error('--candidate must be the 40-character commit that is the tip of remake/v3');
  const steps = stepsFor(candidate);
  const phase = async (name, fn) => {
    const prior = log.phases.find((p) => p.name === name);
    if (prior?.result === 'pass') { deps.log(`${name}: passed earlier (resumed)`); return prior; }
    const startedAt = new Date(deps.now()).toISOString();
    deps.log(`\n[${name}] ${steps[name].who}: ${steps[name].do}`);
    const rec = { name, who: steps[name].who, action: steps[name].do, startedAt, endedAt: null, seconds: null, result: 'fail', observed: {} };
    const at = log.phases.findIndex((p) => p.name === name);
    if (at >= 0) log.phases[at] = rec; else log.phases.push(rec);
    try {
      const t0 = deps.now();
      rec.observed = await fn(rec);
      rec.result = 'pass';
      rec.seconds = Math.round((deps.now() - t0) / 1000);
    } catch (e) {
      rec.result = 'fail';
      rec.observed = { ...rec.observed, error: e.message };
      throw e;
    } finally {
      rec.endedAt = new Date(deps.now()).toISOString();
      save(log);
    }
    return rec;
  };
  const wait = (probe, what) => until(probe, { deps, timeoutS, pollS, what });
  const previewJson = async () => deps.fetchJson(`${baseUrl}preview.json`);

  try {
    await phase('candidate', async () => {
      // The candidate counts as served only once next-preview.yml has COMPLETED for it with success (its smoke job is the last job): the
      // preview names the commit as soon as the deploy job pushes, while the smoke is still running, and a run in progress proves nothing.
      const { value: run } = await wait(async () => {
        const mine = (await deps.runs('next-preview.yml', 'remake/v3')).filter((r) => r.headSha === candidate);
        if (mine.length === 0) return { error: `no next-preview.yml run for ${candidate.slice(0, 8)} yet` };
        const good = mine.find((r) => r.status === 'completed' && r.conclusion === 'success');
        if (good) return good;
        const open = mine.find((r) => r.status !== 'completed');
        if (open) return { error: `the next-preview.yml run ${open.databaseId} for ${candidate.slice(0, 8)} is ${open.status}` };
        return { failed: mine[0] };
      }, `the next-preview.yml run of ${candidate.slice(0, 8)} to complete`);
      if (run.failed) throw new Error(`the next-preview.yml run ${run.failed.databaseId} for ${candidate.slice(0, 8)} completed as ${run.failed.conclusion}: its smoke job was not green`);
      const { value } = await wait(async () => { const j = await previewJson(); return j.remakeCommit === candidate ? j : { error: `the preview serves ${String(j.remakeCommit).slice(0, 8)}` }; }, `the preview to serve ${candidate.slice(0, 8)}`);
      return { previewCommit: value.remakeCommit, release: value.release, builtAt: value.builtAt, runId: run.databaseId };
    });

    let holdSetAt;
    await phase('hold', async () => {
      const { value, seconds } = await wait(async () => { const h = deps.holdValue(); return (await h) === HOLD_VALUE ? { hold: HOLD_VALUE } : { error: 'DEPLOY_HOLD is not set to ' + HOLD_VALUE }; }, `the owner to set DEPLOY_HOLD=${HOLD_VALUE}`);
      holdSetAt = deps.now();
      return { ...value, waitedSeconds: seconds };
    });

    let held;
    await phase('hold-test', async () => {
      const before = await previewJson();
      const { value } = await wait(async () => {
        const run = (await deps.runs('next-main.yml', 'remake/v3')).find((r) => r.status === 'completed' && r.headSha !== candidate && Date.parse(r.createdAt) >= (holdSetAt ?? 0));
        return run ?? { error: 'no completed next-main.yml run after the hold was set' };
      }, 'the hold-test run of next-main.yml to complete');
      const jobs = await deps.jobs(value.databaseId);
      const job = (n) => jobs.find((j) => j.name === n);
      const deploy = job('deploy the artifact to the preview repository');
      const build = job('build the site artifact');
      if (!build || build.conclusion !== 'success') throw new Error('the held run did not build the artifact: the hold must still verify and build');
      if (!deploy || deploy.conclusion !== 'skipped') throw new Error(`the deploy job of the held run is "${deploy?.conclusion ?? 'missing'}", not skipped: THE HOLD DID NOT HOLD`);
      await deps.sleep(Math.min(pollS, 60) * 1000);
      const after = await previewJson();
      if (after.remakeCommit !== before.remakeCommit || after.builtAt !== before.builtAt) throw new Error('the preview moved while the hold was set');
      held = { runId: value.databaseId, headSha: value.headSha };
      return { ...held, deployJob: deploy.conclusion, buildJob: build.conclusion, previewUnchanged: true };
    });

    let requestedAt, servedAt;
    await phase('restore', async () => {
      const { value } = await wait(async () => {
        const run = (await deps.runs('next-main.yml', 'remake/v3')).find((r) => r.databaseId !== held?.runId && r.headSha !== candidate && Date.parse(r.createdAt) > (holdSetAt ?? 0));
        return run ?? { error: 'no next-main.yml run after the hold test' };
      }, 'the restore run of next-main.yml to start');
      requestedAt = Date.parse(value.createdAt);
      const m = JSON.parse(readFileSync(manifest, 'utf8'));
      const { value: served } = await wait(async () => { const p = await previewJson(); return p.restoredFrom ? p : { error: 'preview.json has no restoredFrom yet' }; }, 'the preview to serve the restored site');
      servedAt = deps.now();
      return { runId: value.databaseId, requestedAt: value.createdAt, servedAt: new Date(servedAt).toISOString(), restoredFrom: served.restoredFrom, oldReleaseId: m.oldReleaseId };
    });

    await phase('check', async () => {
      const m = JSON.parse(readFileSync(manifest, 'utf8'));
      const digest = (await previewJson()).restoredFrom;
      const result = await deps.smoke({ baseUrl, manifest: m, profile: 'preview', digest, timeoutS: 120, pollS: 5, startedAt: requestedAt });
      const failed = result.checks.filter((c) => !c.ok);
      if (result.status !== 'pass') throw new Error(`the legacy smoke failed: ${failed.slice(0, 3).map((c) => c.name).join('; ')}`);
      return { filesChecked: result.filesChecked, checks: result.checks.length };
    });

    await phase('candidate-again', async () => {
      const { value } = await wait(async () => {
        const p = await previewJson();
        if (p.restoredFrom) return { error: 'the preview still serves the restored old site' };
        return p;
      }, 'the candidate to be deployed to the preview again');
      const run = (await deps.runs('next-main.yml', 'remake/v3')).find((r) => r.conclusion === 'success' && r.headSha === value.remakeCommit);
      return { previewCommit: value.remakeCommit, release: value.release, nextMainRunId: run?.databaseId ?? null, holdNow: await deps.holdValue() };
    });

    const restoreSeconds = Math.round((servedAt - requestedAt) / 1000);
    log.holdTested = true;
    log.restoreSeconds = restoreSeconds;
    log.result = restoreSeconds <= REHEARSAL_BUDGET_SECONDS ? 'pass' : 'fail';
    log.note = log.result === 'pass' ? '' : `the restore took ${restoreSeconds} s; the line is ${REHEARSAL_BUDGET_SECONDS} s`;
  } catch (e) {
    log.result = 'fail';
    log.note = e.message;
    log.holdTested = log.holdTested ?? (log.phases.find((p) => p.name === 'hold-test')?.result === 'pass');
  }
  log.endedAt = new Date(deps.now()).toISOString();
  log.totalSeconds = Math.round((Date.parse(log.endedAt) - Date.parse(log.startedAt)) / 1000);
  save(log);
  return log;
}

const arg = (argv, name, required = true) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) { if (required) throw new Error(`missing ${name}`); return undefined; }
  return argv[i + 1];
};

async function cli(argv) {
  const [cmd] = argv;
  const root = repoRoot();
  const candidate = arg(argv, '--candidate');
  if (cmd === 'plan') {
    const steps = stepsFor(candidate);
    console.log(`Rollback rehearsal on the preview (${PREVIEW_URL}); the live site is never touched. Candidate ${candidate}.`);
    PHASES.forEach((name, i) => console.log(`${i + 1}. ${name} (${steps[name].who}): ${steps[name].do}`));
    console.log(`The restore must be served within ${REHEARSAL_BUDGET_SECONDS} s of the request. Nothing was done.`);
    return 0;
  }
  if (cmd === 'run') {
    const file = arg(argv, '--log', false) ?? join(root, 'remake', 'rehearsal', `${new Date().toISOString().slice(0, 10)}.json`);
    const resumed = argv.includes('--resume') && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    const log = resumed ?? { schema: 1, candidate, previewBaseUrl: PREVIEW_URL, startedAt: new Date().toISOString(), phases: [], result: 'running', holdTested: null, restoreSeconds: null };
    const save = (l) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, `${JSON.stringify(l, null, 2)}\n`); };
    const out = await rehearse({ candidate, manifest: arg(argv, '--manifest'), timeoutS: Number(arg(argv, '--timeout-s', false) ?? 1800), pollS: Number(arg(argv, '--poll-s', false) ?? 15), log, save }, realDeps(root));
    console.log(`\nrehearsal: ${out.result}${out.note ? ` (${out.note})` : ''}; restore ${out.restoreSeconds ?? '?'} s; hold tested: ${out.holdTested}; log ${file}`);
    return out.result === 'pass' ? 0 : 1;
  }
  throw new Error('usage: rehearse.mjs plan --candidate SHA | run --candidate SHA --manifest FILE [--log FILE] [--timeout-s N] [--poll-s N] [--resume]');
}

if (isMain(import.meta.url)) {
  try { process.exitCode = await cli(process.argv.slice(2)); } catch (e) { console.error(`rehearse failed: ${e.message}`); process.exitCode = 2; }
}
