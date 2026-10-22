#!/usr/bin/env node
// The candidate receipt (WP-34; pack 07 section 11, pack 08 WP-34). A candidate is one named commit of remake/v3. Its receipt,
// remake/candidates/<sha>.json, is filled from commands run on that commit and from the repository's own records, never from memory.
//
//   npm run candidate:receipt -- <sha> [--purpose TEXT] [--skip-browser]   generate the receipt (HEAD must be <sha>, tracked files clean)
//   npm run candidate:check -- <sha>                                       judge it; exit 0 only when it is whole, current and met
//
// candidate:check fails on:
//   - a field that is missing, or was produced on another commit (every section carries the commit it was produced on);
//   - a check that did not pass (not-run is not a pass: this tool never accepts a gap on anyone's behalf);
//   - "main changed": main's tip must equal the commit recorded in remake/baseline/, or differ from it only by the paths the owner
//     accepted in remake/baseline/main-allowed.json (the tamper-proof gate workflow lives on main, owner option A);
//   - the defects-disposition gate (Q2-19): every entry of docs/next/defects.md has a disposition (fixed with a PR or commit, known
//     limitation, or owner-ruled), and an entry that touches science names its transition or its ruling;
//   - the owner's safari-check row missing from remake/attest.csv (absent = not met);
//   - a compatibility report that leaves a transition unsorted, a non-empty port-item queue, a budget over its line, no artifact
//     digest, no legacy zip digest, a rehearsal that is missing, over 15 minutes or did not test the hold, no bus-factor row;
//   - the branch having moved past the candidate by anything but records (remake/candidates, attest, status, measure, rehearsal).
//
// The receipt's reading for the owner is the "summary" block at its top; there is no second document to keep in step.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMain, repoRoot } from './wp-lib.mjs';
import { parseCsv } from './rulings-check.mjs';
import { releaseIdentity } from './release-id.mjs';

export const CANDIDATE_DIR = 'remake/candidates';
export const BASELINE_DIR = 'remake/baseline';
export const MAIN_ALLOWED = 'remake/baseline/main-allowed.json';
export const DEFECTS_PATH = 'docs/next/defects.md';
export const LIMITATIONS_PATH = 'docs/next/known-limitations.md';
export const PORT_QUEUE_PATH = 'remake/port-items.json';
export const LEGACY_RECORD = 'remake/legacy/legacy-final.json';
export const REHEARSAL_DIR = 'remake/rehearsal';
export const REHEARSAL_BUDGET_SECONDS = 900;
/** The sections a receipt must carry, each produced on the candidate's commit. */
export const SECTIONS = ['baseline', 'runtime', 'data', 'checks', 'parity', 'compatibility', 'safari', 'limitations', 'artifact', 'axe', 'budgets', 'portItems', 'defects', 'rollback', 'people'];
/** Paths a branch may change after the candidate without voiding it: records about it, not code. */
export const RECORD_PATHS = ['remake/candidates/', 'remake/attest.csv', 'remake/status/', 'remake/measure/', 'remake/rehearsal/', 'remake/legacy/', 'remake/control/'];
const SHA = /^[0-9a-f]{40}$/;

/** The checks a receipt records, in the order they run. `shell` ones need a shell for their globs. */
export const CHECKS = [
  { id: 'rulings', cmd: 'npm run rulings:check' },
  { id: 'register', cmd: 'npm run checks:register -- --verify --require-frozen' },
  { id: 'cutover-ready', cmd: 'npm run checks:register -- --cutover-ready' },
  { id: 'parity-erase', cmd: 'npm run parity:erase' },
  { id: 'typecheck', cmd: 'npm run typecheck' },
  { id: 'types-ratchet', cmd: 'npm run types:ratchet' },
  { id: 'lint', cmd: 'npm run lint' },
  { id: 'tests-new', cmd: 'node --test tests/claude/*.test.mjs tests/remake/*.test.mjs' },
  { id: 'tests-parity', cmd: 'node --test tests/parity/*.test.mjs' },
  { id: 'tests-domain', cmd: "node --test 'tests/domain/*.test.mjs'" },
  { id: 'parity-noop', cmd: 'npm run parity -- --noop' },
  { id: 'parity-mutate', cmd: 'npm run parity:mutate' },
];
export const PARITY_CMD = 'npm run parity -- --milestone --transitions parity/transitions';
export const BROWSER_CMD = 'npm run test:browser';

// ---- records -------------------------------------------------------------------------------------------------------------
const exists = (root, p) => existsSync(join(root, p));
const readText = (root, p) => readFileSync(join(root, p), 'utf8');
const readJson = (root, p) => JSON.parse(readText(root, p));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The rows of remake/attest.csv: [{ date, key, detail, source }]. */
export function attestRows(root) {
  if (!exists(root, 'remake/attest.csv')) return [];
  const [, ...rows] = parseCsv(readText(root, 'remake/attest.csv'));
  return rows.filter((r) => r.length >= 2).map((r) => ({ date: r[0], key: r[1], detail: r[2] ?? '', source: r[3] ?? '' }));
}

/** The owner's safari-check, as the receipt records it. A detail that names another commit is a check of another commit. */
export function safariOf(root, sha) {
  const row = attestRows(root).filter((r) => r.key === 'safari-check').pop();
  if (!row) return { commit: sha, attested: false, reason: 'no safari-check row in remake/attest.csv (the owner runs: npm run wp:attest -- safari-check ' + sha.slice(0, 8) + ')' };
  const named = /[0-9a-f]{7,40}/.exec(row.detail)?.[0];
  if (named && !sha.startsWith(named) && !named.startsWith(sha.slice(0, named.length))) return { commit: sha, attested: false, date: row.date, detail: row.detail, reason: `the safari-check row names ${named.slice(0, 8)}, not this candidate` };
  return { commit: sha, attested: true, date: row.date, detail: row.detail };
}

/** The transitions at the candidate, sorted into the four kinds of the compatibility report (GPT 07 section 4). */
export const KIND_TO_CLASS = { science: 'policy', policy: 'policy', display: 'presentation', presentation: 'presentation', determinism: 'intentional', intentional: 'intentional', data: 'factual', factual: 'factual' };
export function compatibilityOf(root, sha) {
  const dir = join(root, 'parity/transitions');
  const out = { commit: sha, factual: [], policy: [], presentation: [], intentional: [], unsorted: [], quirksKept: 0 };
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const t = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      const entry = { id: t.id, kind: t.kind, differences: Array.isArray(t.differences) ? t.differences.length : null, ruling: t.ruling ?? '', file: `parity/transitions/${f}` };
      const cls = KIND_TO_CLASS[t.kind];
      (cls ? out[cls] : out.unsorted).push(entry);
    }
  }
  if (exists(root, 'docs/next/quirks-kept.md')) out.quirksKept = (readText(root, 'docs/next/quirks-kept.md').match(/^#{2,4} /gm) ?? []).length;
  return out;
}

/** Known limitations: the lines "- **L-NN.** text" of docs/next/known-limitations.md, and the defects kept as limitations. */
export function limitationsOf(root, sha) {
  const items = [];
  if (exists(root, LIMITATIONS_PATH)) for (const m of readText(root, LIMITATIONS_PATH).matchAll(/^- \*\*(L-\d+)\.\*\* (.+)$/gm)) items.push({ id: m[1], text: m[2].trim() });
  const defects = parseDefects(exists(root, DEFECTS_PATH) ? readText(root, DEFECTS_PATH) : '');
  const kept = defects.filter((d) => /^known limitation/i.test(d.disposition ?? '')).map((d) => d.id);
  return { commit: sha, items, defectsKeptAsLimitations: kept };
}

export function portQueueOf(root, sha) {
  if (!exists(root, PORT_QUEUE_PATH)) return { commit: sha, present: false, items: null };
  const j = readJson(root, PORT_QUEUE_PATH);
  return { commit: sha, present: true, items: Array.isArray(j.items) ? j.items : null };
}

// ---- the defects-disposition gate (Q2-19) ---------------------------------------------------------------------------------
const DEFECT_HEADING = /^### ([A-Z]+\d+-D\d+)\. (.+)$/;

/** The entries of docs/next/defects.md: { id, title, disposition, science } (a field is null where the entry does not state it). */
export function parseDefects(text) {
  const entries = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (/^#{2,3} /.test(line)) {
      const m = DEFECT_HEADING.exec(line);
      cur = m ? { id: m[1], title: m[2], disposition: null, science: null } : null;
      if (cur) entries.push(cur);
      continue;
    }
    if (!cur) continue;
    const d = /^- \*\*Disposition\.\*\* (.+)$/.exec(line);
    if (d) cur.disposition = d[1].trim();
    const s = /^- \*\*Science\.\*\* (.+)$/.exec(line);
    if (s) cur.science = s[1].trim();
  }
  return entries;
}

/**
 * The problems of the defects file. `rulingIds` and `transitionIds` are what exist; a disposition or a science line may name only those.
 * Disposition: "fixed in PR #N" | "fixed in commit <hex>" | "known limitation..." | "owner-ruled by R-...".
 * Science: "no" | "yes: transition <id>" | "yes: ruling R-..." (a fix of a science entry names its transition).
 */
export function defectsProblems(text, { rulingIds, transitionIds }) {
  const problems = [];
  const entries = parseDefects(text);
  if (entries.length === 0) problems.push(`${DEFECTS_PATH} lists no defect entry (### <WP>-D<n>. title): nothing to judge, so the gate cannot pass`);
  for (const e of entries) {
    const at = `${e.id}`;
    const d = e.disposition;
    if (!d) { problems.push(`${at}: no "Disposition." line (fixed with a PR or commit, known limitation, or owner-ruled)`); }
    else if (/^fixed\b/i.test(d)) { if (!/\bPR #\d+\b|\bcommit [0-9a-f]{7,40}\b/.test(d)) problems.push(`${at}: "fixed" names no PR (#N) or commit`); }
    else if (/^known limitation\b/i.test(d)) { /* a limitation is a disposition; the receipt lists it */ }
    else if (/^owner-ruled\b/i.test(d)) {
      const ids = d.match(/\bR-[A-Za-z0-9-]+/g) ?? [];
      if (ids.length === 0 || !ids.every((i) => rulingIds.has(i))) problems.push(`${at}: "owner-ruled" must name rulings that exist in docs/next/rulings.csv (found: ${ids.join(', ') || 'none'})`);
    } else problems.push(`${at}: disposition "${d.slice(0, 40)}" is none of: fixed, known limitation, owner-ruled`);
    const s = e.science;
    if (!s) problems.push(`${at}: no "Science." line (no, or yes: naming its transition or its ruling)`);
    else if (!/^no\b/i.test(s)) {
      if (!/^yes\b/i.test(s)) problems.push(`${at}: Science must start with "no" or "yes"`);
      else {
        const rulings = s.match(/\bR-[A-Za-z0-9-]+/g) ?? [];
        const transitions = [...s.matchAll(/\btransition (\d{4}-\d{2}-\d{2}-[a-z0-9-]+)/g)].map((m) => m[1]);
        if (rulings.length + transitions.length === 0) problems.push(`${at}: touches science but names no transition or ruling`);
        for (const r of rulings) if (!rulingIds.has(r)) problems.push(`${at}: names ruling ${r}, which is not in docs/next/rulings.csv`);
        for (const t of transitions) if (!transitionIds.has(t)) problems.push(`${at}: names transition ${t}, which is not in parity/transitions/`);
        if (d && /^fixed\b/i.test(d) && transitions.length === 0) problems.push(`${at}: a fix that touches science names its transition`);
      }
    }
  }
  return { entries: entries.length, problems };
}

export function defectsOf(root, sha) {
  const text = exists(root, DEFECTS_PATH) ? readText(root, DEFECTS_PATH) : '';
  const rulingIds = new Set(parseCsv(exists(root, 'docs/next/rulings.csv') ? readText(root, 'docs/next/rulings.csv') : '').slice(1).map((r) => r[0]).filter(Boolean));
  const transitionDir = join(root, 'parity/transitions');
  const transitionIds = new Set(existsSync(transitionDir) ? readdirSync(transitionDir).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, '')) : []);
  const r = defectsProblems(text, { rulingIds, transitionIds });
  return { commit: sha, entries: r.entries, problems: r.problems, ok: r.problems.length === 0 };
}

// ---- main unchanged ----------------------------------------------------------------------------------------------------------
/** The baseline receipt this repository records: { file, recordedMain }. The newest by generatedAt when there are several. */
export function baselineOf(root) {
  const dir = join(root, BASELINE_DIR);
  const files = existsSync(dir) ? readdirSync(dir).filter((n) => /^[0-9a-f]{8}\.json$/.test(n)) : [];
  if (files.length === 0) return null;
  const all = files.map((n) => ({ file: `${BASELINE_DIR}/${n}`, json: JSON.parse(readFileSync(join(dir, n), 'utf8')) }));
  all.sort((a, b) => String(a.json.generatedAt).localeCompare(String(b.json.generatedAt)));
  const last = all.pop();
  return { file: last.file, recordedMain: last.json.git?.originMain ?? null };
}

export function mainAllowance(root) {
  if (!exists(root, MAIN_ALLOWED)) return { paths: [], entries: [] };
  const j = readJson(root, MAIN_ALLOWED);
  return { paths: (j.allowed ?? []).map((a) => a.path), entries: j.allowed ?? [], baseline: j.baseline ?? null };
}

/**
 * Whether main is as the baseline recorded it. `observe()` returns { tip, source } or throws; `changedPaths(a, b)` returns the files that differ
 * between two commits or null when they cannot be told. Anything that cannot be observed is "changed": this check does not guess.
 */
export function mainState(root, { observe, changedPaths }) {
  const base = baselineOf(root);
  const out = { baselineFile: base?.file ?? null, recordedMain: base?.recordedMain ?? null, observedMain: null, source: null, changedPaths: [], acceptedPaths: [], unchanged: false, why: '' };
  if (!base || !SHA.test(base.recordedMain ?? '')) { out.why = 'remake/baseline/ holds no baseline receipt that records main\'s commit'; return out; }
  let seen;
  try { seen = observe(); } catch (e) { out.why = `main's tip could not be observed: ${e.message}`; return out; }
  out.observedMain = seen.tip; out.source = seen.source;
  if (!SHA.test(seen.tip ?? '')) { out.why = `main's tip is not a commit: "${seen.tip}"`; return out; }
  if (seen.tip === base.recordedMain) { out.unchanged = true; return out; }
  const changed = changedPaths(base.recordedMain, seen.tip);
  if (changed === null) { out.why = `main moved from ${base.recordedMain.slice(0, 8)} to ${seen.tip.slice(0, 8)} and the difference cannot be listed here`; return out; }
  out.changedPaths = changed;
  const allow = mainAllowance(root);
  out.acceptedPaths = changed.filter((p) => allow.paths.includes(p));
  const other = changed.filter((p) => !allow.paths.includes(p));
  if (other.length === 0) { out.unchanged = true; out.why = `main moved to ${seen.tip.slice(0, 8)} by accepted paths only (${MAIN_ALLOWED})`; return out; }
  out.why = `main changed: ${other.length} path(s) differ from the baseline ${base.recordedMain.slice(0, 8)} and are not accepted (first: ${other[0]})`;
  return out;
}

// ---- rollback ----------------------------------------------------------------------------------------------------------------
export function rehearsalOf(root) {
  const dir = join(root, REHEARSAL_DIR);
  const logs = existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith('.json')).sort() : [];
  if (logs.length === 0) return null;
  const file = `${REHEARSAL_DIR}/${logs[logs.length - 1]}`;
  return { file, ...readJson(root, file) };
}

export function rollbackOf(root, sha) {
  const legacy = exists(root, LEGACY_RECORD) ? readJson(root, LEGACY_RECORD) : null;
  const rehearsal = rehearsalOf(root);
  const keys = new Set(attestRows(root).map((r) => r.key));
  return {
    commit: sha,
    legacyZip: legacy ? { asset: legacy.asset, digest: legacy.digest, manifestDigest: legacy.manifestDigest, mainCommit: legacy.mainCommit, release: 'h2c-legacy-final', record: LEGACY_RECORD } : null,
    rehearsal: rehearsal ? { file: rehearsal.file, result: rehearsal.result ?? null, restoreSeconds: rehearsal.restoreSeconds ?? null, holdTested: rehearsal.holdTested ?? null, candidate: rehearsal.candidate ?? null } : null,
    busFactorRollback: keys.has('bus-factor-rollback'),
    notRun: [...(legacy ? [] : ['the old site is not saved: the owner runs remake/tools/save-legacy.sh']), ...(rehearsal ? [] : ['no rehearsal log in remake/rehearsal/'])],
  };
}

// ---- the judgement -----------------------------------------------------------------------------------------------------------
/**
 * Every problem with a receipt. `live` is what the repository and GitHub say now (see `observeNow`): the receipt's own claims are checked
 * against it where it can change after the receipt is written (main, the attest rows, the defects file, the transitions, the branch).
 * @returns {string[]}
 */
export function judge(receipt, sha, live) {
  const problems = [];
  const add = (m) => problems.push(m);
  if (receipt === null || typeof receipt !== 'object') return ['the receipt is not a JSON object'];
  if (receipt.schema !== 1) add('schema must be 1');
  if (receipt.candidate?.sha !== sha) add(`candidate.sha is ${receipt.candidate?.sha}, not ${sha}`);
  for (const k of SECTIONS) {
    const s = receipt[k];
    if (s === undefined || s === null || typeof s !== 'object') { add(`field ${k} is missing`); continue; }
    if (s.commit !== sha) add(`field ${k} was produced on ${String(s.commit).slice(0, 8)}, not on ${sha.slice(0, 8)}`);
  }
  // checks
  const have = new Map((receipt.checks?.results ?? []).map((c) => [c.id, c]));
  for (const c of CHECKS) {
    const r = have.get(c.id);
    if (!r) { add(`check ${c.id} has no result`); continue; }
    if (r.commit !== sha) add(`check ${c.id} was run on ${String(r.commit).slice(0, 8)}, not on ${sha.slice(0, 8)}`);
    if (r.status !== 'pass') add(`check ${c.id}: ${r.status}${r.note ? ` (${r.note})` : ''}`);
  }
  if (receipt.parity) {
    if (receipt.parity.status !== 'pass') add(`parity: ${receipt.parity.status ?? 'no status'}${receipt.parity.note ? ` (${receipt.parity.note})` : ''}`);
  }
  // the report is sorted, and covers the transitions there are now
  const comp = receipt.compatibility;
  if (comp) {
    if ((comp.unsorted ?? []).length) add(`compatibility report: ${comp.unsorted.length} transition(s) fit none of factual, policy, presentation, intentional (${comp.unsorted.map((t) => t.id).join(', ')})`);
    const listed = new Set(['factual', 'policy', 'presentation', 'intentional'].flatMap((k) => (comp[k] ?? []).map((t) => t.id)));
    for (const id of live.transitionIds) if (!listed.has(id)) add(`compatibility report lacks transition ${id}`);
    for (const id of listed) if (!live.transitionIds.has(id)) add(`compatibility report names transition ${id}, which is not in parity/transitions/`);
  }
  // people who must say yes
  if (receipt.safari && receipt.safari.attested !== true) add(`safari-check: not met (${receipt.safari.reason ?? 'no row'})`);
  if (!live.safari.attested) add(`safari-check: not met now (${live.safari.reason})`);
  // limitations
  if (receipt.limitations && (receipt.limitations.items ?? []).length === 0 && (receipt.limitations.defectsKeptAsLimitations ?? []).length === 0) add('the known-limitation list is empty: the field exists to say what is not known to work');
  // artifact and budgets
  if (receipt.artifact && !/^sha256:[0-9a-f]{64}$/.test(receipt.artifact.digest ?? '')) add(`artifact: no digest (${receipt.artifact.note ?? 'the site was not assembled'})`);
  if (receipt.budgets) {
    if (receipt.budgets.ok !== true) add(`budgets: ${receipt.budgets.note ?? 'a budget is over its line or was not measured'}`);
    if (receipt.budgets.ok === true && receipt.artifact && receipt.budgets.siteBytes == null) add('budgets: the site size was not measured');
  }
  if (receipt.axe && (!receipt.axe.pages || receipt.axe.pages.length === 0)) add(`axe: no report (${receipt.axe.note ?? 'the browser suite did not run on this commit'})`);
  // the queue of unported changes
  if (receipt.portItems && receipt.portItems.items === null) add(`port-item queue: ${receipt.portItems.present ? 'malformed' : 'remake/port-items.json is missing'}`);
  if (receipt.portItems?.items?.length) add(`port-item queue holds ${receipt.portItems.items.length} item(s)`);
  if (live.portItems.items === null) add('port-item queue: remake/port-items.json is missing or malformed now');
  else if (live.portItems.items.length) add(`port-item queue holds ${live.portItems.items.length} item(s) now`);
  // rollback
  const rb = receipt.rollback;
  if (rb) {
    if (!rb.legacyZip?.digest) add('rollback: the legacy zip digest is not recorded (save-legacy.sh, then commit remake/legacy/legacy-final.json)');
    if (!rb.rehearsal) add('rollback: no rehearsal log');
    else {
      if (rb.rehearsal.result !== 'pass') add(`rollback: the rehearsal result is ${rb.rehearsal.result}`);
      if (!(rb.rehearsal.restoreSeconds <= REHEARSAL_BUDGET_SECONDS)) add(`rollback: the restore took ${rb.rehearsal.restoreSeconds} s, the line is ${REHEARSAL_BUDGET_SECONDS} s`);
      if (rb.rehearsal.holdTested !== true) add('rollback: the rehearsal did not show that a push under DEPLOY_HOLD did not deploy');
    }
    if (!rb.busFactorRollback) add('rollback: no bus-factor-rollback row in remake/attest.csv');
  }
  // the defects gate, now
  if (!live.defects.ok) for (const p of live.defects.problems) add(`defects gate: ${p}`);
  // main
  if (!live.main.unchanged) add(live.main.why || 'main changed');
  if (receipt.baseline && receipt.baseline.recordedMain !== live.main.recordedMain) add(`baseline: the receipt records main ${String(receipt.baseline.recordedMain).slice(0, 8)}, remake/baseline/ records ${String(live.main.recordedMain).slice(0, 8)}`);
  // the branch
  if (live.moved.length) add(`the branch moved past the candidate by more than records: ${live.moved.slice(0, 3).join(', ')}${live.moved.length > 3 ? `, and ${live.moved.length - 3} more` : ''} (name the new candidate)`);
  return problems;
}

/** What the world says now, for `judge`. `deps` replaces the git and network reads in tests. */
export function observeNow(root, sha, deps = {}) {
  const git = deps.git ?? ((args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }));
  const transitionDir = join(root, 'parity/transitions');
  const moved = (() => {
    const head = git(['rev-parse', 'HEAD']);
    if (head.status !== 0) return ['HEAD cannot be read'];
    if (head.stdout.trim() === sha) return [];
    const diff = git(['diff', '--name-only', sha, 'HEAD']);
    if (diff.status !== 0) return [`the candidate ${sha.slice(0, 8)} is not an ancestor of HEAD or cannot be compared`];
    return diff.stdout.split('\n').filter(Boolean).filter((p) => !RECORD_PATHS.some((r) => p === r || p.startsWith(r)));
  })();
  const observe = deps.observeMain ?? (() => {
    const ls = git(['ls-remote', 'origin', 'refs/heads/main']);
    if (ls.status === 0 && /^[0-9a-f]{40}\t/.test(ls.stdout)) return { tip: ls.stdout.split('\t')[0], source: 'git ls-remote origin refs/heads/main' };
    const fetched = git(['fetch', '--quiet', 'origin', 'main']);
    const rev = git(['rev-parse', 'refs/remotes/origin/main']);
    if (fetched.status === 0 && rev.status === 0) return { tip: rev.stdout.trim(), source: 'git fetch origin main' };
    throw new Error('neither git ls-remote nor git fetch could reach origin');
  });
  const changedPaths = deps.changedPaths ?? ((a, b) => {
    let r = git(['diff', '--name-only', a, b]);
    if (r.status !== 0) { git(['fetch', '--quiet', 'origin', 'main']); r = git(['diff', '--name-only', a, b]); }
    return r.status === 0 ? r.stdout.split('\n').filter(Boolean) : null;
  });
  return {
    main: mainState(root, { observe, changedPaths }),
    safari: safariOf(root, sha),
    defects: defectsOf(root, sha),
    portItems: portQueueOf(root, sha),
    transitionIds: new Set(existsSync(transitionDir) ? readdirSync(transitionDir).filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, '')) : []),
    moved,
  };
}

export function receiptPath(sha) { return `${CANDIDATE_DIR}/${sha}.json`; }

/** Resolves a sha or prefix to the full commit. */
export function resolveSha(root, given, git = (args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' })) {
  if (!/^[0-9a-f]{7,40}$/.test(given ?? '')) throw new Error(`"${given}" is not a commit id (7 to 40 hex characters)`);
  const r = git(['rev-parse', '--verify', `${given}^{commit}`]);
  if (r.status !== 0) throw new Error(`${given} is not a commit in this checkout`);
  return r.stdout.trim();
}

/** The whole `candidate:check`. Returns { sha, problems, receipt }. */
export function checkCandidate(root, given, deps = {}) {
  const sha = resolveSha(root, given, deps.git);
  const file = receiptPath(sha);
  if (!exists(root, file)) return { sha, problems: [`${file} does not exist (npm run candidate:receipt -- ${sha.slice(0, 8)} makes it)`], receipt: null };
  let receipt;
  try { receipt = readJson(root, file); } catch (e) { return { sha, problems: [`${file} is not JSON: ${e.message}`], receipt: null }; }
  return { sha, problems: judge(receipt, sha, observeNow(root, sha, deps)), receipt };
}

// ---- the generator -----------------------------------------------------------------------------------------------------------
const tail = (out) => out.trim().split('\n').slice(-5).join('\n').slice(-500);

/** Runs a command in a shell; the result is a check record. `run` is replaceable. */
export function runCommand(cmd, root, sha, { timeoutMs = 3_600_000, run } = {}) {
  const started = Date.now();
  const r = (run ?? ((c) => spawnSync(c, { cwd: root, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: timeoutMs })))(cmd);
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const base = { cmd, commit: sha, durationMs: Date.now() - started, tail: tail(out) };
  if (r.error) return { ...base, status: 'not-run', note: `could not start: ${r.error.message}` };
  if (r.status === 127) return { ...base, status: 'not-run', note: 'command not found' };
  if (r.status !== 0) return { ...base, status: 'fail', exitCode: r.status };
  // exit 0 with output that says something was skipped is not a pass (wp:check's rule)
  if (/\bSKIPPED\b|\bnot run:|\bNOT RUN\b|# SKIP\b|\bskipped [1-9]|^[ \t]*(?:ℹ |# )?(?:tests 0|todo [1-9]\d*)[ \t]*$/m.test(out)) return { ...base, status: 'not-run', exitCode: 0, note: 'exit 0, but the output says it skipped or ran nothing' };
  return { ...base, status: 'pass', exitCode: 0 };
}

function runtimeOf(root, sha) {
  let sqlite = null;
  try { sqlite = new (globalThis.process.getBuiltinModule('node:sqlite').DatabaseSync)(':memory:').prepare('select sqlite_version() as v').get().v; } catch { sqlite = null; }
  return { commit: sha, nvmrc: exists(root, '.nvmrc') ? readText(root, '.nvmrc').trim() : null, node: process.version, icu: process.versions.icu ?? null, sqlite, platform: `${process.platform}-${process.arch}`, ci: 'linux-x64 (CI); the owner\'s Mac is a second host (gap-1: six estimate leaves differ across hosts)' };
}

function axeOf(root, sha, startedMs) {
  const pages = [];
  const runs = [];
  for (const path of ['live-path', 'preview-path']) {
    const f = `remake/measure/axe/${path}/index.json`;
    if (!exists(root, f)) continue;
    const fresh = statSync(join(root, f)).mtimeMs >= startedMs - 1000; // a file system stamps files a little behind the clock
    const j = readJson(root, f);
    runs.push({ project: path, runId: j.runId, mode: j.mode, axe: j.axe, fresh, sha256: sha256(readFileSync(join(root, f))) });
    if (fresh) pages.push(...j.pages.map((p) => ({ project: path, ...p })));
  }
  const note = pages.length ? 'reported, not blocking (owner ruling OQ-15 B)' : runs.length ? 'the axe files in the tree are older than this run: the browser suite did not run on this commit' : 'no axe report in the tree';
  return { commit: sha, runs, pages, violatedRules: pages.reduce((n, p) => n + (p.violatedRules ?? 0), 0), note };
}

/** Builds the receipt. Slow: it runs the checks. `deps.run` replaces the shell (tests); `deps.assemble` replaces the site build. */
export function generate(root, given, { purpose = 'release candidate', skipBrowser = false } = {}, deps = {}) {
  const git = deps.git ?? ((args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' }));
  const sha = resolveSha(root, given, git);
  const head = git(['rev-parse', 'HEAD']).stdout.trim();
  if (head !== sha) throw new Error(`HEAD is ${head.slice(0, 8)}, not ${sha.slice(0, 8)}: a receipt is made on the commit it describes (check it out in a worktree)`);
  const dirty = git(['status', '--porcelain', '--untracked-files=no']).stdout.split('\n').filter(Boolean).filter((l) => !RECORD_PATHS.some((p) => l.slice(3).startsWith(p)));
  if (dirty.length) throw new Error(`tracked files differ from the commit (${dirty[0].trim()}): a receipt describes a commit, not a working tree`);
  const startedMs = Date.now();
  const run = (cmd) => runCommand(cmd, root, sha, { run: deps.run });
  const live = observeNow(root, sha, deps);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  let data;
  try { const id = (deps.releaseIdentity ?? releaseIdentity)(root); data = { commit: sha, releaseId: id.id, inputs: { data: id.inputs.data, schema: id.inputs.schema, rules: id.inputs.rules, engine: id.inputs.engine, view: id.inputs.view } }; }
  catch (e) { data = { commit: sha, releaseId: null, note: `the release identity could not be computed: ${e.message}` }; }

  const results = CHECKS.map((c) => ({ id: c.id, ...run(c.cmd) }));
  const parityRun = run(PARITY_CMD);
  const parity = { commit: sha, cmd: PARITY_CMD, status: parityRun.status, exitCode: parityRun.exitCode ?? null, result: /^RESULT:.*$/m.exec(parityRun.tail)?.[0] ?? null, durationMs: parityRun.durationMs, ...(parityRun.note ? { note: parityRun.note } : {}), tail: parityRun.tail };

  let browser = null;
  if (!skipBrowser) browser = { id: 'browser', ...run(BROWSER_CMD) };
  const axe = axeOf(root, sha, startedMs);
  if (skipBrowser) axe.note = 'the browser suite was skipped for this receipt (--skip-browser), so there is no axe report on this commit';
  if (browser) results.push(browser);

  const siteDir = join(root, '.cache', 'candidate-site');
  const artifactRun = (deps.assemble ?? ((s) => {
    const a = run(`node remake/tools/artifact.mjs assemble --site ${JSON.stringify(s)} --profile live --commit ${sha}`);
    if (a.status !== 'pass') return { status: a.status, note: a.note ?? tail(a.tail) };
    const d = run(`node remake/tools/artifact.mjs digest --site ${JSON.stringify(s)} --out ${JSON.stringify(join(root, '.cache', 'candidate-artifact.json'))}`);
    const z = run(`node remake/tools/size-report.mjs --site ${JSON.stringify(s)} --out ${JSON.stringify(join(root, '.cache', 'candidate-sizes.json'))}`);
    return { status: d.status, digestRun: d, sizeRun: z, artifact: exists(root, '.cache/candidate-artifact.json') ? readJson(root, '.cache/candidate-artifact.json') : null, sizes: exists(root, '.cache/candidate-sizes.json') ? readJson(root, '.cache/candidate-sizes.json') : null };
  }))(siteDir);
  const artifact = { commit: sha, digest: artifactRun.artifact?.digest ?? null, files: artifactRun.artifact?.files ?? null, bytes: artifactRun.artifact?.bytes ?? null, profile: 'live', where: 'rebuilt by candidate:receipt into .cache/candidate-site; next-main.yml builds it again and its deploy job checks this digest', ...(artifactRun.artifact ? {} : { note: artifactRun.note ?? 'the site could not be assembled' }) };
  const sizes = artifactRun.sizes;
  const budgets = { commit: sha, ok: sizes?.ok === true, siteBytes: sizes?.site?.bytes ?? null, checks: sizes?.checks ?? null, ...(sizes ? {} : { note: 'the size report was not produced' }) };

  const receipt = {
    schema: 1,
    summary: null,
    candidate: { sha, branch, purpose, generatedAt: new Date().toISOString() },
    baseline: { commit: sha, ...live.main, mainChecked: 'at the time of the receipt; candidate:check observes main again' },
    runtime: runtimeOf(root, sha),
    data,
    checks: { commit: sha, results },
    parity,
    compatibility: compatibilityOf(root, sha),
    safari: live.safari,
    limitations: limitationsOf(root, sha),
    artifact,
    axe,
    budgets,
    portItems: live.portItems,
    defects: live.defects,
    rollback: rollbackOf(root, sha),
    people: { commit: sha, teamTrial: 'not run: WP-33 (the team trial) is deferred by the owner', agentWritten: 'the test answers on the method page and the transitions\' reviews are agent-written until the owner reviews them (OQ-11 A; R-ATTEST-AGENT)', required: false },
  };
  receipt.summary = summarize(receipt, judge(receipt, sha, live));
  return receipt;
}

/** The one-page reading: what passed, what did not, and the decision line the owner fills in with wp:attest. */
export function summarize(receipt, problems) {
  return {
    commit: receipt.candidate.sha,
    verdict: problems.length === 0 ? 'met' : 'not met',
    problems,
    checks: `${receipt.checks.results.filter((c) => c.status === 'pass').length} of ${receipt.checks.results.length} passed`,
    parity: receipt.parity.status,
    transitions: ['factual', 'policy', 'presentation', 'intentional'].map((k) => `${k} ${receipt.compatibility[k].length}`).join(', '),
    decision: 'the owner decides (cutover-approved <sha> via npm run wp:attest); this receipt never does',
  };
}

// ---- command line -----------------------------------------------------------------------------------------------------------
function cli(argv) {
  const [cmd, given, ...rest] = argv;
  const root = repoRoot();
  if (cmd === 'check') {
    if (!given) {
      // `npm run candidate:check` with no commit (the work-package exit check): judge the newest receipt, or say that nothing is named.
      const files = existsSync(join(root, CANDIDATE_DIR)) ? readdirSync(join(root, CANDIDATE_DIR)).filter((n) => /^[0-9a-f]{40}\.json$/.test(n)) : [];
      if (files.length === 0) { console.log('candidate:check: not run: no candidate is named and remake/candidates/ holds no receipt'); return 0; }
      return cli(['check', files.map((f) => ({ f, t: statSync(join(root, CANDIDATE_DIR, f)).mtimeMs })).sort((a, b) => a.t - b.t).pop().f.replace('.json', '')]);
    }
    const { sha, problems } = checkCandidate(root, given);
    for (const p of problems) console.error(`candidate:check: ${p}`);
    if (problems.length) { console.error(`candidate:check: ${sha.slice(0, 8)} is NOT MET (${problems.length} problem(s))`); return 1; }
    console.log(`candidate:check: ${sha.slice(0, 8)} is met: every field is present and was produced on that commit`);
    return 0;
  }
  if (cmd === 'receipt') {
    if (!given) throw new Error('usage: candidate:receipt -- <sha> [--purpose TEXT] [--skip-browser]');
    const at = rest.indexOf('--purpose');
    const receipt = generate(root, given, { purpose: at >= 0 ? rest[at + 1] : 'release candidate', skipBrowser: rest.includes('--skip-browser') });
    mkdirSync(join(root, CANDIDATE_DIR), { recursive: true });
    const file = receiptPath(receipt.candidate.sha);
    writeFileSync(join(root, file), `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`${file} written: ${receipt.summary.verdict}; ${receipt.summary.checks}; parity ${receipt.parity.status}`);
    for (const p of receipt.summary.problems) console.log(`  not met: ${p}`);
    return 0;
  }
  throw new Error('usage: candidate.mjs check [<sha>] | receipt <sha> [--purpose TEXT] [--skip-browser]');
}

if (isMain(import.meta.url)) {
  try { process.exitCode = cli(process.argv.slice(2)); } catch (e) { console.error(`candidate failed: ${e.message}`); process.exitCode = 2; }
}
