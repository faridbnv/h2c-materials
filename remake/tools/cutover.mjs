#!/usr/bin/env node
// What next-main.yml may do with a run (WP-32; pack 07 sections 12 and 13). One pure decision, `planRun`, read by the workflow's
// `plan` job and tested without GitHub. Node built-ins only, so the job needs no install.
//
//   node remake/tools/cutover.mjs plan      reads the run from environment variables (EVENT_NAME, REF, SHA, BEFORE, INPUT_MODE,
//                                           INPUT_RESTORE, DEPLOY_HOLD), writes GITHUB_OUTPUT and the step summary, exits 1 on a refusal;
//                                           with REQUIRE_ACTION=deploy|restore it also exits 1 unless that action is allowed to deploy
//
// Rules, in the order they apply:
//   1. Where it runs. refs/heads/main is the live path; refs/heads/remake/v3 is the dry run, which deploys to the PREVIEW repository.
//      Any other ref is refused. A manual run can ask for the dry run on either ref, never for the live path on remake/v3.
//   2. The live path refuses to run unless the cutover is recorded: a `cutover-approved <40-hex sha>` row in remake/attest.csv whose
//      commit is the deployed commit or one of its ancestors. The workflow reaches main only through the cutover merge, and this
//      refusal is the second lock (a copy of the file on main before the owner's decision still deploys nothing).
//   3. On remake/v3 a push matters only when it changes remake/control/ (a branch-only workflow cannot be dispatched, so the control
//      file is how a rehearsal asks for a restore or for the hold test). Ordinary pushes are next-preview.yml's.
//   4. A restore is requested by committing remake/control/restore.json; it acts only on the push that changed that file (or a manual
//      run that asks for it), so a later push never restores again.
//   5. DEPLOY_HOLD (a repository variable the owner sets; this code reads it and never sets it). While it is non-empty only the
//      restore the hold names may deploy; every other run verifies and builds but does not deploy. A restore without its hold set is
//      refused, because the next push would deploy over it (pack 07 section 13.2).
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';
import { parseCsv } from './rulings-check.mjs';

export const CONTROL_PATH = 'remake/control/restore.json';
export const CONTROL_DIR = 'remake/control/';
/** Files under remake/control/ that are not requests to next-main.yml (the receipt request belongs to candidate-receipt.yml). */
export const NOT_A_RESTORE_CONTROL = ['remake/control/receipt.json'];
export const isControlChange = (f) => f.startsWith(CONTROL_DIR) && !NOT_A_RESTORE_CONTROL.includes(f);
export const LIVE_BRANCH = 'refs/heads/main';
export const DRY_RUN_BRANCH = 'refs/heads/remake/v3';
const SHA = /^[0-9a-f]{40}$/;
const ZERO = /^0{40}$/;

/** The text of DEPLOY_HOLD: empty means no hold. */
export const holdOf = (value) => String(value ?? '').trim();

/** The restore request in a parsed control file: null for no request, else the validated request. Throws a sentence for anything else. */
export function validateControl(json) {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) throw new Error(`${CONTROL_PATH} must be a JSON object`);
  if (json.schema !== 1) throw new Error(`${CONTROL_PATH}: schema must be 1`);
  if (json.request === null) return null;
  const r = json.request;
  if (r === undefined || typeof r !== 'object' || Array.isArray(r)) throw new Error(`${CONTROL_PATH}: request must be null or an object`);
  const need = (k, re, what) => { if (typeof r[k] !== 'string' || !re.test(r[k])) throw new Error(`${CONTROL_PATH}: request.${k} must be ${what}`); };
  need('id', /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/, 'a short name of letters, digits, dots, dashes (3 to 64 characters)');
  need('hold', /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, 'the DEPLOY_HOLD value this restore answers');
  need('tag', /^h2c-legacy-final$/, 'the release tag h2c-legacy-final');
  need('asset', /^legacy-site-[0-9a-f]{12}\.zip$/, 'the saved site, legacy-site-<12 hex>.zip');
  need('digest', /^sha256:[0-9a-f]{64}$/, 'sha256: and 64 hex characters, the digest save-legacy.sh printed');
  need('reason', /\S{3}/, 'a sentence saying why');
  const extra = Object.keys(r).filter((k) => !['id', 'hold', 'tag', 'asset', 'digest', 'reason'].includes(k));
  if (extra.length) throw new Error(`${CONTROL_PATH}: unknown field(s) in request: ${extra.join(', ')}`);
  return { ...r };
}

/** Reads the control file of a checkout: null when it holds no request. A missing or malformed file throws (never read as "no request"). */
export function readControl(root = repoRoot()) {
  const p = join(root, CONTROL_PATH);
  if (!existsSync(p)) throw new Error(`${CONTROL_PATH} is missing`);
  let json;
  try { json = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${CONTROL_PATH} is not JSON: ${e.message}`); }
  return validateControl(json);
}

/** The `cutover-approved` rows of remake/attest.csv: [{ date, sha }] (a row whose detail does not start with a 40-hex SHA is malformed and ignored). */
export function cutoverRows(root = repoRoot()) {
  const p = join(root, 'remake', 'attest.csv');
  if (!existsSync(p)) return [];
  const [, ...rows] = parseCsv(readFileSync(p, 'utf8'));
  return rows.filter((r) => r[1] === 'cutover-approved').map((r) => ({ date: r[0], sha: (r[2] ?? '').trim().split(/\s+/)[0] })).filter((r) => SHA.test(r.sha));
}

/** Whether the cutover is recorded for `sha`: some approved candidate equals it or is its ancestor. `isAncestor(a, b)` answers whether a is an ancestor of b. */
export function cutoverRecorded(root, sha, isAncestor) {
  const rows = cutoverRows(root);
  const hit = rows.find((r) => r.sha === sha || isAncestor(r.sha, sha));
  return hit ? { recorded: true, row: hit } : { recorded: false, rows: rows.length };
}

/**
 * The decision for one run.
 * @param {{ event: string, ref: string, inputMode?: string, inputRestore?: boolean, hold?: string, changedFiles: string[]|null, root: string, sha: string, isAncestor: (a: string, b: string) => boolean }} run
 *   `changedFiles`: the files the push changed, or null when unknown (a manual run).
 * @returns {{ run: boolean, mode: 'live'|'dry-run'|'none', action: 'deploy'|'restore'|'weekly'|'none', deploy: boolean, refused: boolean, reason: string, request: object|null }}
 */
export function planRun(run) {
  const out = (o) => ({ run: false, mode: 'none', action: 'none', deploy: false, refused: false, request: null, ...o });
  const refuse = (reason, mode = 'none') => out({ refused: true, mode, reason });
  const { event, ref } = run;
  if (ref !== LIVE_BRANCH && ref !== DRY_RUN_BRANCH) return refuse(`ref ${ref} is neither main (live) nor remake/v3 (dry run)`);
  const asked = run.inputMode ?? '';
  if (asked && !['dry-run', 'live'].includes(asked)) return refuse(`mode "${asked}" is not dry-run or live`);
  if (asked === 'live' && ref !== LIVE_BRANCH) return refuse('the live path runs only from main');
  const mode = asked === 'dry-run' || ref === DRY_RUN_BRANCH ? 'dry-run' : 'live';
  if (event === 'schedule') {
    if (ref !== LIVE_BRANCH) return refuse('the weekly checks run from main');
    return out({ run: true, mode: 'live', action: 'weekly', reason: 'weekly checks (no deploy)' });
  }
  if (!['push', 'workflow_dispatch'].includes(event)) return refuse(`event ${event} is not one this workflow acts on`);
  if (mode === 'live') {
    const c = cutoverRecorded(run.root, run.sha, run.isAncestor);
    if (!c.recorded) return refuse(`the live deploy is refused: remake/attest.csv has no "cutover-approved ${run.sha.slice(0, 8)}" row for this commit or an ancestor of it (${c.rows} cutover row(s) found)`, 'live');
  }
  const controlChanged = run.changedFiles === null ? false : run.changedFiles.some(isControlChange);
  if (event === 'push' && ref === DRY_RUN_BRANCH && !controlChanged) {
    return out({ mode, reason: 'a push to remake/v3 that does not touch remake/control/; next-preview.yml deploys ordinary pushes' });
  }
  let request;
  try { request = readControl(run.root); } catch (e) { return refuse(e.message, mode); }
  const wantsRestore = request !== null && (run.inputRestore === true || (event === 'push' && controlChanged));
  const hold = holdOf(run.hold);
  const base = { run: true, mode, request };
  if (wantsRestore) {
    if (hold === '') return refuse(`restore "${request.id}" is refused: DEPLOY_HOLD is not set. The owner sets it first (gh variable set DEPLOY_HOLD --body ${request.hold}); otherwise the next push would deploy over the restored site`, mode);
    if (hold !== request.hold) return refuse(`restore "${request.id}" answers hold "${request.hold}", but DEPLOY_HOLD is "${hold}"`, mode);
    return out({ ...base, action: 'restore', deploy: true, reason: `restore ${request.id}: the saved site ${request.asset} under hold ${hold}` });
  }
  if (hold !== '') return out({ ...base, action: 'deploy', deploy: false, reason: `DEPLOY_HOLD is "${hold}": verified and built, not deployed` });
  return out({ ...base, action: 'deploy', deploy: true, reason: mode === 'live' ? 'live deploy of the tested artifact' : 'dry run: deploy to the preview repository' });
}

const git = (args, cwd) => spawnSync('git', args, { cwd, encoding: 'utf8' });

/** The files a push changed (null when it cannot be told, which the plan treats as "no control change"). */
export function changedFilesOf(before, sha, cwd) {
  const r = !before || ZERO.test(before) ? git(['show', '--name-only', '--format=', sha], cwd) : git(['diff', '--name-only', before, sha], cwd);
  return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : null;
}

export const gitIsAncestor = (cwd) => (a, b) => git(['merge-base', '--is-ancestor', a, b], cwd).status === 0;

function cli() {
  const env = process.env;
  const root = repoRoot();
  const sha = env.SHA ?? '';
  if (!SHA.test(sha)) throw new Error(`SHA is not a 40-character commit: "${sha}"`);
  const event = env.EVENT_NAME ?? '';
  const plan = planRun({
    event, ref: env.REF ?? '', inputMode: env.INPUT_MODE ?? '', inputRestore: env.INPUT_RESTORE === 'true', hold: env.DEPLOY_HOLD ?? '',
    changedFiles: event === 'push' ? changedFilesOf(env.BEFORE, sha, root) : null, root, sha, isAncestor: gitIsAncestor(root),
  });
  const lines = [
    `mode=${plan.mode}`, `action=${plan.action}`, `run=${plan.run}`, `deploy=${plan.deploy}`,
  ];
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${lines.join('\n')}\n`);
  const summary = `next-main plan: ${plan.refused ? 'REFUSED' : plan.run ? 'run' : 'nothing to do'}; mode ${plan.mode}, action ${plan.action}, deploy ${plan.deploy}. ${plan.reason}`;
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  if (plan.refused) console.error(`::error::${plan.reason}`);
  // A job that re-checks before it touches Pages or releases says which action it is about to take (REQUIRE_ACTION=deploy|restore):
  // anything else, or a deploy the hold forbids, stops that job.
  const need = env.REQUIRE_ACTION ?? '';
  if (need && !plan.refused && (plan.action !== need || !plan.deploy)) {
    console.error(`::error::this job takes the action "${need}", but the plan is: action ${plan.action}, deploy ${plan.deploy}. ${plan.reason}`);
    return 1;
  }
  return plan.refused ? 1 : 0;
}

if (isMain(import.meta.url)) {
  try {
    if (process.argv[2] !== 'plan') throw new Error('usage: cutover.mjs plan (reads EVENT_NAME, REF, SHA, BEFORE, INPUT_MODE, INPUT_RESTORE, DEPLOY_HOLD)');
    process.exitCode = cli();
  } catch (e) { console.error(`cutover failed: ${e.message}`); process.exitCode = 1; }
}
