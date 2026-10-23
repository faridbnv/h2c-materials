#!/usr/bin/env node
// What did the live dry run prove? (docs/next/live-dryrun.md.) Reads a throwaway mirror repository with the GitHub API (read only: every call is
// `gh api` with no method override and no field) and writes remake/rehearsal/live-dryrun-<date>.json, in the shape of the other rehearsal logs
// (remake/rehearsal/2026-10-23.json): a list of phases, each with its run, its jobs and what was observed, and one overall result.
//
//   node remake/tools/live-dryrun-check.mjs <owner/repo> [--out FILE] [--legacy FILE] [--candidate SHA]
//
// Four phases, each judged from the mirror's own runs:
//   old-site     the frozen main was pushed to the mirror; Verify and Publish to Pages (the OLD workflows) deployed the old site.
//   live-deploy  the cutover merge on main: Next main took the live path (verify, build, deploy-pages with the digest checked, live smoke, the
//                release h2c-<id>). The digest the build computed, the digest the deploy job checked and the digest of the kept release are one.
//   restore      under DEPLOY_HOLD, `next-main.yml -f mode=live -f restore=true` put the saved old site back; its legacy smoke passed.
//   revert       `git revert -m 1` of the cutover merge was pushed; the old workflows published the old site again, and Next main did not run.
// A phase with no run to judge is "missing", not "pass": the overall result is "pass" only when all four pass, "fail" when one fails, else
// "incomplete". The mirror is the only repository this reads; it refuses the real repositories.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';

export const PROTECTED_REPOS = Object.freeze(['faridbnv/h2c-materials', 'faridbnv/h2c-material-temp-page']);
export const PHASES = Object.freeze(['old-site', 'live-deploy', 'restore', 'revert']);
const SHA = /^[0-9a-f]{40}$/;
const DIGEST = /sha256:[0-9a-f]{64}/;

const JOB = Object.freeze({
  plan: 'plan',
  build: 'build the site artifact',
  deploy: 'deploy the artifact to GitHub Pages',
  smoke: 'smoke on the live address',
  release: 'keep the release',
  result: 'next-main result',
  restore: 'restore the saved old site on GitHub Pages',
  restoreSmoke: 'legacy smoke on the live address',
});

/** The mirror's name, or a thrown sentence: the real repositories are refused, and the name must say it is a dry run. */
export function assertMirror(repo) {
  const r = String(repo ?? '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9._-]+$/.test(r)) throw new Error(`"${r}" is not OWNER/NAME`);
  if (PROTECTED_REPOS.includes(r.toLowerCase())) throw new Error(`${r} is a real repository: this check reads only a dry-run mirror`);
  if (!/dry-?run/i.test(r.split('/')[1])) throw new Error(`${r}: the name of a dry-run mirror must contain "dryrun" or "dry-run"`);
  return r;
}

/** `gh api` and nothing else: no method override, no field, no input. Returns stdout. `run` is replaceable in tests. */
export function ghReader(run = (args) => spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })) {
  return (args) => {
    if (args[0] !== 'api') throw new Error(`live-dryrun-check reads with "gh api" only, not "gh ${args[0]}"`);
    const bad = args.find((a) => /^(-X|--method|-f|-F|--field|--raw-field|--input)$/.test(a) || /^-X./.test(a));
    if (bad) throw new Error(`live-dryrun-check is read only: "${bad}" is refused`);
    const r = run(args);
    if (r.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
    return r.stdout;
  };
}

const ndjson = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
const secondsBetween = (a, b) => (a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 1000) : null);
const file = (p) => p.replace(/^\.github\/workflows\//, '');

/**
 * Everything the judgement reads, gathered with `gh api` (read only). `deps`: `gh(args)`, `fetchText(url)` (null when it cannot be had),
 * `legacy` (the parsed remake/legacy/legacy-final.json or null), `candidate` (optional).
 */
export async function collect(repo, deps) {
  const { gh } = deps;
  const api = (path, ...more) => gh(['api', path, ...more]);
  const evidence = { repo, collectedAt: new Date().toISOString(), pagesUrl: null, legacy: deps.legacy ?? null, commits: {}, runs: [], logs: {}, release: null, holdNow: null, servedRelease: null };
  try { evidence.pagesUrl = api(`repos/${repo}/pages`, '--jq', '.html_url').trim() || null; } catch { /* Pages not enabled yet */ }

  // The history of main: the cutover merge is the first commit with two parents; its first parent is the frozen main.
  const commits = JSON.parse(api(`repos/${repo}/commits?sha=main&per_page=60`));
  const merge = commits.find((c) => c.parents.length === 2) ?? null;
  const reverts = merge ? commits.slice(0, commits.indexOf(merge)).filter((c) => /^Revert /.test(c.commit.message) && c.commit.message.includes(merge.sha)) : [];
  evidence.commits = { mergeSha: merge?.sha ?? null, frozenMain: merge?.parents[0].sha ?? null, revertSha: reverts[0]?.sha ?? null, candidate: deps.candidate ?? null };
  if (merge && !evidence.commits.candidate) {
    try {
      const tip = JSON.parse(api(`repos/${repo}/commits/${merge.parents[1].sha}`));
      evidence.commits.candidate = tip.commit.message.match(/cutover approval for ([0-9a-f]{40})/)?.[1] ?? null;
    } catch { /* the candidate stays unknown */ }
  }

  const runs = ndjson(api(`repos/${repo}/actions/runs?per_page=100`, '--paginate', '--jq', '.workflow_runs[] | {id, name, path, event, branch: .head_branch, sha: .head_sha, status, conclusion, createdAt: .created_at, startedAt: .run_started_at, updatedAt: .updated_at}'));
  const wanted = new Set([evidence.commits.frozenMain, evidence.commits.mergeSha, evidence.commits.revertSha].filter(Boolean));
  for (const run of runs) {
    if (run.branch !== 'main') continue;
    const relevant = file(run.path) === 'next-main.yml' || wanted.has(run.sha);
    if (!relevant) continue;
    run.jobs = ndjson(api(`repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`, '--paginate', '--jq', '.jobs[] | {id, name, conclusion, startedAt: .started_at, completedAt: .completed_at}'));
    evidence.runs.push(run);
  }
  // The logs the judgement reads: a few named jobs of the next-main runs.
  const logJobs = new Set([JOB.plan, JOB.build, JOB.deploy, JOB.release, JOB.smoke, JOB.restoreSmoke]);
  for (const run of evidence.runs.filter((r) => file(r.path) === 'next-main.yml')) {
    for (const job of run.jobs.filter((j) => logJobs.has(j.name) && j.conclusion)) {
      try { evidence.logs[job.id] = api(`repos/${repo}/actions/jobs/${job.id}/logs`); } catch { evidence.logs[job.id] = null; }
    }
  }

  // The kept release of the cutover merge, and its artifact.json.
  if (evidence.commits.mergeSha) {
    const releases = JSON.parse(api(`repos/${repo}/releases?per_page=30`));
    // The release of this deploy targets the merge; one kept already for the same content (a rerun) targets an older commit, and is the newest
    // release that is neither the saved old site nor the old release the old pipeline made.
    const oldTag = deps.legacy?.oldReleaseId ? `h2c-${deps.legacy.oldReleaseId}` : null;
    const siteReleases = releases.filter((r) => /^h2c-[0-9a-f]{12}$/.test(r.tag_name) && r.tag_name !== oldTag);
    const kept = siteReleases.find((r) => r.target_commitish === evidence.commits.mergeSha) ?? siteReleases[0] ?? null;
    if (kept) {
      evidence.release = { tag: kept.tag_name, target: kept.target_commitish, assets: kept.assets.map((a) => a.name), artifact: null };
      const a = kept.assets.find((x) => x.name === 'artifact.json');
      if (a) { try { evidence.release.artifact = JSON.parse(api(`repos/${repo}/releases/assets/${a.id}`, '-H', 'Accept: application/octet-stream')); } catch { /* judged as missing */ } }
    }
  }
  try { evidence.holdNow = api(`repos/${repo}/actions/variables/DEPLOY_HOLD`, '--jq', '.value').trim(); } catch (e) { evidence.holdNow = /404|Not Found/i.test(e.message) ? '' : null; }
  if (evidence.pagesUrl && deps.fetchText) {
    const text = await deps.fetchText(`${evidence.pagesUrl.replace(/\/?$/, '/')}manifest.json`);
    try { evidence.servedRelease = text === null ? null : JSON.parse(text).release ?? null; } catch { evidence.servedRelease = null; }
  }
  return evidence;
}

// ---- the judgement ------------------------------------------------------------------------------------------------------------------
const newest = (runs) => [...runs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
const jobOf = (run, name) => run?.jobs.find((j) => j.name === name) ?? null;
const jobsView = (run) => (run?.jobs ?? []).map((j) => ({ name: j.name, conclusion: j.conclusion ?? 'running' }));
const runView = (run) => (run ? { runId: run.id, conclusion: run.conclusion ?? run.status } : { runId: null, conclusion: null });

/** One phase: `problems` empty means pass; `null` run means missing. */
const phase = (name, run, observed, problems, { missing = null } = {}) => ({
  name,
  ...runView(run),
  jobs: jobsView(run),
  observed,
  result: missing ? 'missing' : problems.length === 0 ? 'pass' : 'fail',
  problems: missing ? [missing] : problems,
});

const wantJobs = (run, names, problems) => {
  for (const n of names) {
    const j = jobOf(run, n);
    if (!j) problems.push(`the job "${n}" did not run`);
    else if (j.conclusion !== 'success') problems.push(`the job "${n}" ended ${j.conclusion ?? 'unfinished'}`);
  }
};

const logOf = (evidence, run, name) => evidence.logs[jobOf(run, name)?.id] ?? null;

/** The old pipeline on one commit: Verify, then Publish to Pages with its deploy job. Returns the runs and the problems with them. */
function oldPipeline(ev, sha, what, hint = '') {
  const verify = newest(ev.runs.filter((r) => file(r.path) === 'verify.yml' && r.sha === sha));
  const pages = newest(ev.runs.filter((r) => file(r.path) === 'pages.yml' && r.sha === sha));
  const problems = [];
  if (!verify || verify.conclusion !== 'success') problems.push(`Verify on ${what} ended ${verify?.conclusion ?? 'with no run'}`);
  if (!pages || pages.conclusion !== 'success') problems.push(`Publish to Pages on ${what} ended ${pages?.conclusion ?? 'with no run'}${hint}`);
  else if (jobOf(pages, 'deploy')?.conclusion !== 'success') problems.push('the deploy job of Publish to Pages did not succeed');
  const pending = [verify, pages].some((r) => r && r.status !== 'completed');
  return { verify, pages, problems, none: (!verify && !pages) || pending };
}

function judgeOldSite(ev) {
  const sha = ev.commits.frozenMain;
  if (!sha) return phase('old-site', null, {}, [], { missing: 'no cutover merge in the history of main, so the frozen main is not known' });
  const { verify, pages, problems, none } = oldPipeline(ev, sha, 'the frozen main');
  if (none) return phase('old-site', null, { frozenMain: sha }, [], { missing: `Verify and Publish to Pages have not both finished on the frozen main ${sha.slice(0, 8)} (no run, or still running)` });
  return phase('old-site', pages ?? verify, { frozenMain: sha, verifyRunId: verify?.id ?? null, pagesRunId: pages?.id ?? null, oldSiteDeployedAt: jobOf(pages, 'deploy')?.completedAt ?? null }, problems);
}

const match = (text, re) => text?.match(re)?.[1] ?? null;

function judgeLiveDeploy(ev) {
  const sha = ev.commits.mergeSha;
  if (!sha) return phase('live-deploy', null, {}, [], { missing: 'no cutover merge (a commit with two parents) in the history of main' });
  const run = newest(ev.runs.filter((r) => file(r.path) === 'next-main.yml' && r.sha === sha && r.event === 'push'));
  if (!run) return phase('live-deploy', null, { mergeSha: sha }, [], { missing: `Next main has no push run on the cutover merge ${sha.slice(0, 8)}` });
  if (run.status !== 'completed') return phase('live-deploy', run, { mergeSha: sha }, [], { missing: `the Next main run ${run.id} is still ${run.status}` });
  const problems = [];
  if (run.conclusion !== 'success') problems.push(`the Next main run ended ${run.conclusion ?? run.status}`);
  wantJobs(run, [JOB.plan, JOB.build, JOB.deploy, JOB.smoke, JOB.release, JOB.result], problems);
  const verifyJobs = run.jobs.filter((j) => j.name.startsWith('verify /'));
  if (!verifyJobs.some((j) => j.name.endsWith('next-verify') && j.conclusion === 'success')) problems.push('the called verify job next-verify did not succeed');
  for (const j of verifyJobs.filter((x) => x.conclusion !== 'success' && x.conclusion !== 'skipped')) problems.push(`${j.name} ended ${j.conclusion ?? 'unfinished'}`);
  const planLine = match(logOf(ev, run, JOB.plan), /(next-main plan: .*)/);
  if (planLine && !/mode live, action deploy, deploy true/.test(planLine)) problems.push(`the plan did not take the live deploy path: ${planLine}`);

  // The artifact is one: the build computed it, the deploy job checked it, the release job checked it again, and the kept release names it.
  const built = match(logOf(ev, run, JOB.build), new RegExp(`(${DIGEST.source}) \\(\\d+ files, \\d+ bytes\\)`));
  const deployed = match(logOf(ev, run, JOB.deploy), new RegExp(`artifact digest (${DIGEST.source}) matches`));
  const released = match(logOf(ev, run, JOB.release), new RegExp(`artifact digest (${DIGEST.source}) matches`));
  const kept = ev.release?.artifact?.digest ?? null;
  const digests = { artifactDigest: built, deployedDigest: deployed, releaseCheckDigest: released, releasedDigest: kept };
  for (const [k, v] of Object.entries(digests)) if (!v) problems.push(`${k} could not be read from the run`);
  if (new Set(Object.values(digests).filter(Boolean)).size > 1) problems.push(`the digests differ: ${JSON.stringify(digests)}`);

  const smokeLog = logOf(ev, run, JOB.smoke);
  const smokeResult = smokeLog === null ? null : /smoke: pass/.test(smokeLog) ? 'pass' : 'fail';
  if (smokeResult !== 'pass') problems.push(`the live smoke did not report "smoke: pass" (${smokeResult ?? 'no log'})`);

  const need = ev.release ? [`site-${ev.release.tag.slice(4)}.zip`, 'release.json', 'artifact.json', 'decision-diff.md'] : [];
  const warnings = [];
  if (!ev.release) problems.push(`no release h2c-<id> was kept for the cutover merge ${sha.slice(0, 8)}`);
  else {
    for (const a of need) if (!ev.release.assets.includes(a)) problems.push(`the release ${ev.release.tag} lacks ${a}`);
    if (ev.release.target !== sha) warnings.push(`the release ${ev.release.tag} targets ${ev.release.target}, not the merge: it was kept already for the same content`);
  }

  // The merge deletes the old Verify and Publish to Pages: none may start on the merge commit or on any commit after it except the revert's.
  const oldRuns = ev.runs.filter((r) => ['verify.yml', 'pages.yml'].includes(file(r.path)) && r.sha !== ev.commits.frozenMain && r.sha !== ev.commits.revertSha);
  if (oldRuns.length) problems.push(`an old workflow ran after the cutover merge (${oldRuns.map((r) => `${file(r.path)} on ${r.sha.slice(0, 8)}, ${r.conclusion ?? r.status}`).join(', ')}): the merge must delete .github/workflows/pages.yml and verify.yml`);
  const newDeployAt = jobOf(run, JOB.deploy)?.completedAt ?? null;

  return phase('live-deploy', run, {
    mergeSha: sha, candidate: ev.commits.candidate, ...digests, liveSmoke: smokeResult, release: ev.release?.tag ?? null,
    releaseAssets: ev.release?.assets ?? [], oldWorkflowsOnMerge: oldRuns.map((r) => ({ workflow: file(r.path), runId: r.id, conclusion: r.conclusion })),
    nextMainDeployedAt: newDeployAt, warnings,
    seconds: secondsBetween(run.startedAt ?? run.createdAt, run.updatedAt),
  }, problems);
}

function judgeRestore(ev) {
  const run = newest(ev.runs.filter((r) => file(r.path) === 'next-main.yml' && r.event === 'workflow_dispatch'));
  if (!run) return phase('restore', null, {}, [], { missing: 'Next main has no run started by hand (gh workflow run next-main.yml --ref main -f mode=live -f restore=true)' });
  if (run.status !== 'completed') return phase('restore', run, {}, [], { missing: `the restore run ${run.id} is still ${run.status}` });
  const problems = [];
  if (run.conclusion !== 'success') problems.push(`the Next main run ended ${run.conclusion ?? run.status}`);
  wantJobs(run, [JOB.plan, JOB.restore, JOB.restoreSmoke, JOB.result], problems);
  const planLine = match(logOf(ev, run, JOB.plan), /(next-main plan: .*)/);
  if (!planLine || !/mode live, action restore, deploy true/.test(planLine)) problems.push(`the plan did not take the live restore path: ${planLine ?? 'no plan line in the log'}`);
  const log = logOf(ev, run, JOB.restoreSmoke);
  const smokeResult = log === null ? null : /legacy smoke: pass/.test(log) ? 'pass' : 'fail';
  if (smokeResult !== 'pass') problems.push(`the legacy smoke did not report "legacy smoke: pass" (${smokeResult ?? 'no log'})`);
  const filesChecked = Number(match(log, /all (\d+) files of the manifest served with their digests/)) || null;
  if (ev.legacy?.fileCount && filesChecked && filesChecked !== ev.legacy.fileCount) problems.push(`the smoke matched ${filesChecked} files, the saved site has ${ev.legacy.fileCount}`);
  const warnings = [];
  if (ev.holdNow) warnings.push(`DEPLOY_HOLD is still set to "${ev.holdNow}" on the mirror`);
  if (ev.holdNow === null) warnings.push('DEPLOY_HOLD could not be read from the mirror');
  return phase('restore', run, {
    plan: planLine, legacySmoke: smokeResult, filesChecked, oldReleaseId: ev.legacy?.oldReleaseId ?? null, restoreSeconds: secondsBetween(run.startedAt ?? run.createdAt, run.updatedAt),
    holdNow: ev.holdNow, warnings,
  }, problems);
}

function judgeRevert(ev) {
  const sha = ev.commits.revertSha;
  if (!sha) return phase('revert', null, {}, [], { missing: 'no revert of the cutover merge on main (git revert -m 1)' });
  const { verify, pages, problems, none } = oldPipeline(ev, sha, 'the revert', ': the old workflow did not republish');
  if (none) return phase('revert', null, { revertSha: sha }, [], { missing: `Verify and Publish to Pages have not both finished on the revert ${sha.slice(0, 8)} (no run, or still running)` });
  const nextMain = ev.runs.filter((r) => file(r.path) === 'next-main.yml' && r.sha === sha);
  if (nextMain.length) problems.push('Next main ran on the revert, which should no longer contain it');
  const oldId = ev.legacy?.oldReleaseId ?? null;
  if (!oldId) problems.push('the saved old site\'s release id is unknown (remake/legacy/legacy-final.json was not read), so the revert cannot be judged');
  else if (ev.servedRelease === null) problems.push(`the address ${ev.pagesUrl ?? '(unknown)'} gave no manifest.json, so it is not shown to serve the old site`);
  else if (ev.servedRelease !== oldId) problems.push(`the address serves release ${ev.servedRelease}, not the old release ${oldId}`);
  return phase('revert', pages ?? verify, { revertSha: sha, verifyRunId: verify?.id ?? null, pagesRunId: pages?.id ?? null, nextMainRuns: nextMain.length, servedRelease: ev.servedRelease, oldReleaseId: oldId, republishedAt: jobOf(pages, 'deploy')?.completedAt ?? null }, problems);
}

/** The report from the evidence: pure, so it is tested with fake runs. */
export function judgeDryrun(ev, now = new Date()) {
  const phases = [judgeOldSite(ev), judgeLiveDeploy(ev), judgeRestore(ev), judgeRevert(ev)];
  const result = phases.some((p) => p.result === 'fail') ? 'fail' : phases.every((p) => p.result === 'pass') ? 'pass' : 'incomplete';
  const todo = phases.filter((p) => p.result === 'missing').map((p) => `${p.name}: ${p.problems[0]}`);
  return {
    schema: 1,
    kind: 'live-dryrun',
    repo: ev.repo,
    candidate: ev.commits.candidate,
    mergeSha: ev.commits.mergeSha,
    pagesUrl: ev.pagesUrl,
    startedAt: ev.runs.map((r) => r.createdAt).sort()[0] ?? null,
    phases,
    result,
    note: result === 'pass' ? '' : result === 'fail' ? phases.filter((p) => p.result === 'fail').map((p) => `${p.name}: ${p.problems[0]}`).join('; ') : `not yet judged: ${todo.join('; ')}`,
    endedAt: now.toISOString(),
  };
}

export const reportName = (now = new Date()) => `live-dryrun-${now.toISOString().slice(0, 10)}.json`;

const arg = (argv, name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };

async function cli(argv) {
  const repo = assertMirror(argv[0]);
  const root = repoRoot();
  const legacyFile = arg(argv, '--legacy') ?? join(root, 'remake', 'legacy', 'legacy-final.json');
  const legacy = existsSync(legacyFile) ? JSON.parse(readFileSync(legacyFile, 'utf8')) : null;
  const candidate = arg(argv, '--candidate');
  if (candidate !== undefined && !SHA.test(candidate)) throw new Error('--candidate must be a 40-character commit');
  const fetchText = async (url) => { try { const res = await fetch(`${url}?cb=${Date.now()}`, { signal: AbortSignal.timeout(30000) }); return res.status === 200 ? await res.text() : null; } catch { return null; } };
  const evidence = await collect(repo, { gh: ghReader(), fetchText, legacy, candidate });
  const report = judgeDryrun(evidence);
  const out = arg(argv, '--out') ?? join(root, 'remake', 'rehearsal', reportName());
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  for (const p of report.phases) console.log(`${p.result.padEnd(7)} ${p.name}${p.runId ? ` (run ${p.runId})` : ''}${p.problems.length ? `: ${p.problems.join('; ')}` : ''}`);
  for (const p of report.phases) for (const w of p.observed.warnings ?? []) console.log(`warning  ${p.name}: ${w}`);
  console.log(`live dry run: ${report.result}. Written to ${out}`);
  return report.result === 'pass' ? 0 : 1;
}

if (isMain(import.meta.url)) {
  try { process.exitCode = await cli(process.argv.slice(2)); } catch (e) { console.error(`live-dryrun-check failed: ${e.message}`); process.exitCode = 2; }
}
